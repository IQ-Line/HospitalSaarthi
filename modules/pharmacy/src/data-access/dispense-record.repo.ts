import { and, eq, inArray, sql, type DbInstance } from "@hims/ts-sdk-db";
import { asc } from "drizzle-orm";
import { buildDispenseLineRows } from "./build-dispense-line-rows.js";
import type { DispenseLineItemRecord, DispenseRecord } from "../domain/pharmacy.types.js";
import { computeRecordAmounts } from "../lib/dispense-amounts.js";
import type { DispenseRecordRepo, UpsertDispensePayload, UpsertDispenseResult } from "../ports.js";
import { dispenseLineItems, dispenseRecords } from "../schema/tables.js";

function mapRecord(row: typeof dispenseRecords.$inferSelect): DispenseRecord {
  return {
    id: row.id,
    iq_tenant_id: row.iq_tenant_id,
    walk_in_order: row.walk_in_order,
    walk_in_patient_id: row.walk_in_patient_id,
    visit_id: row.visit_id,
    patient_id: row.patient_id,
    opd_prescription_id: row.opd_prescription_id,
    subtotal: row.subtotal,
    discount: row.discount,
    total_amount: row.total_amount,
    notes: row.notes,
    dispense_status: row.dispense_status as DispenseRecord["dispense_status"],
    created_at: row.created_at,
    created_by: row.created_by,
  };
}

function mapLine(row: typeof dispenseLineItems.$inferSelect): DispenseLineItemRecord {
  return {
    id: row.id,
    iq_tenant_id: row.iq_tenant_id,
    dispense_record_id: row.dispense_record_id,
    medicine_id: row.medicine_id ?? null,
    medicine_display_name: row.medicine_display_name,
    prescribed_quantity: row.prescribed_quantity,
    quantity_dispensed: row.quantity_dispensed,
    unit_amount: row.unit_amount,
    line_discount: row.line_discount,
    tax_percent: row.tax_percent,
    tax_amount: row.tax_amount,
    line_total: row.line_total,
    created_at: row.created_at,
  };
}

function isPgUniqueViolation(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error != null &&
    "code" in error &&
    (error as { code: string }).code === "23505"
  );
}

export class DrizzleDispenseRecordRepo implements DispenseRecordRepo {
  constructor(private readonly db: DbInstance) {}

  async findByVisit(tenantId: string, visitId: string): Promise<DispenseRecord | undefined> {
    const [row] = await this.db
      .select()
      .from(dispenseRecords)
      .where(
        and(
          eq(dispenseRecords.iq_tenant_id, tenantId),
          eq(dispenseRecords.visit_id, visitId),
          eq(dispenseRecords.walk_in_order, false),
        ),
      )
      .limit(1);
    return row ? mapRecord(row) : undefined;
  }

  async listByVisitIds(tenantId: string, visitIds: string[]): Promise<DispenseRecord[]> {
    if (visitIds.length === 0) return [];
    const rows = await this.db
      .select()
      .from(dispenseRecords)
      .where(
        and(
          eq(dispenseRecords.iq_tenant_id, tenantId),
          eq(dispenseRecords.walk_in_order, false),
          inArray(dispenseRecords.visit_id, visitIds),
        ),
      );
    return rows.map(mapRecord);
  }

  async findLinesByRecordId(tenantId: string, recordId: string): Promise<DispenseLineItemRecord[]> {
    const rows = await this.db
      .select()
      .from(dispenseLineItems)
      .where(
        and(
          eq(dispenseLineItems.iq_tenant_id, tenantId),
          eq(dispenseLineItems.dispense_record_id, recordId),
        ),
      )
      .orderBy(asc(dispenseLineItems.created_at), asc(dispenseLineItems.id));
    return rows.map(mapLine);
  }

  async upsertForVisit(tenantId: string, payload: UpsertDispensePayload): Promise<UpsertDispenseResult> {
    try {
      return await this.upsertForVisitTx(tenantId, payload);
    } catch (error) {
      if (isPgUniqueViolation(error)) {
        return this.upsertForVisitTx(tenantId, payload);
      }
      throw error;
    }
  }

  private async upsertForVisitTx(
    tenantId: string,
    payload: UpsertDispensePayload,
  ): Promise<UpsertDispenseResult> {
    const lineInserts = buildDispenseLineRows(tenantId, "pending", payload.lines);
    const amounts = computeRecordAmounts(
      lineInserts.map((row) => ({ line_total: row.line_total as string })),
      payload.discount,
    );

    return this.db.transaction(async (tx) => {
      await tx.execute(sql`
        SELECT id FROM pharmacy.dispense_records
        WHERE iq_tenant_id = ${tenantId}::uuid
          AND visit_id = ${payload.visit_id}::uuid
          AND walk_in_order = false
        FOR UPDATE
      `);

      const existing = await tx
        .select()
        .from(dispenseRecords)
        .where(
          and(
            eq(dispenseRecords.iq_tenant_id, tenantId),
            eq(dispenseRecords.visit_id, payload.visit_id),
            eq(dispenseRecords.walk_in_order, false),
          ),
        )
        .limit(1);

      let recordRow: typeof dispenseRecords.$inferSelect;

      if (existing[0]) {
        const [updated] = await tx
          .update(dispenseRecords)
          .set({
            patient_id: payload.patient_id,
            opd_prescription_id: payload.opd_prescription_id ?? null,
            subtotal: amounts.subtotal,
            discount: amounts.discount,
            total_amount: amounts.total_amount,
            notes: payload.notes ?? null,
            dispense_status: payload.dispense_status,
          })
          .where(
            and(
              eq(dispenseRecords.iq_tenant_id, tenantId),
              eq(dispenseRecords.id, existing[0].id),
            ),
          )
          .returning();
        if (!updated) {
          throw new Error("dispense record update failed");
        }
        recordRow = updated;

        await tx
          .delete(dispenseLineItems)
          .where(
            and(
              eq(dispenseLineItems.iq_tenant_id, tenantId),
              eq(dispenseLineItems.dispense_record_id, recordRow.id),
            ),
          );
      } else {
        const [inserted] = await tx
          .insert(dispenseRecords)
          .values({
            iq_tenant_id: tenantId,
            walk_in_order: false,
            walk_in_patient_id: null,
            visit_id: payload.visit_id,
            patient_id: payload.patient_id,
            opd_prescription_id: payload.opd_prescription_id ?? null,
            subtotal: amounts.subtotal,
            discount: amounts.discount,
            total_amount: amounts.total_amount,
            notes: payload.notes ?? null,
            dispense_status: payload.dispense_status,
            created_by: payload.created_by ?? null,
          })
          .returning();
        if (!inserted) {
          throw new Error("dispense record insert failed");
        }
        recordRow = inserted;
      }

      const rowsToInsert = buildDispenseLineRows(tenantId, recordRow.id, payload.lines);
      let lines: DispenseLineItemRecord[] = [];
      if (rowsToInsert.length > 0) {
        const insertedLines = await tx.insert(dispenseLineItems).values(rowsToInsert).returning();
        lines = insertedLines.map(mapLine);
      }

      return { record: mapRecord(recordRow), lines };
    });
  }
}

export function createDispenseRecordRepo(db: DbInstance): DispenseRecordRepo {
  return new DrizzleDispenseRecordRepo(db);
}
