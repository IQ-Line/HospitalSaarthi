import { and, eq, type DbInstance } from "@hims/ts-sdk-db";
import { asc, desc, gte, inArray, lte, sql } from "drizzle-orm";
import { buildDispenseLineRows } from "./build-dispense-line-rows.js";
import type {
  DispenseLineItemRecord,
  DispenseRecord,
  SaveWalkInPatientInput,
  WalkInPatientRecord,
  WalkInQueueSummary,
} from "../domain/pharmacy.types.js";
import { computeRecordAmounts, normalizeDiscount } from "../lib/dispense-amounts.js";
import type {
  UpsertWalkInDispensePayload,
  WalkInDispenseDetail,
  WalkInDispenseRepo,
} from "../ports.js";
import { dispenseLineItems, dispenseRecords, walkInPatients } from "../schema/tables.js";

function mapPatient(row: typeof walkInPatients.$inferSelect): WalkInPatientRecord {
  return {
    id: row.id,
    iq_tenant_id: row.iq_tenant_id,
    first_name: row.first_name,
    last_name: row.last_name,
    phone: row.phone,
    gender: row.gender,
    date_of_birth: row.date_of_birth,
    created_at: row.created_at,
  };
}

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
    created_at: row.created_at,
    created_by: row.created_by,
  };
}

function mapLine(row: typeof dispenseLineItems.$inferSelect): DispenseLineItemRecord {
  return {
    id: row.id,
    iq_tenant_id: row.iq_tenant_id,
    dispense_record_id: row.dispense_record_id,
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

function patientInsertValues(tenantId: string, patient: SaveWalkInPatientInput) {
  return {
    iq_tenant_id: tenantId,
    first_name: patient.first_name.trim(),
    last_name: patient.last_name?.trim() || null,
    phone: patient.phone?.trim() || null,
    gender: patient.gender,
    date_of_birth: patient.date_of_birth?.trim() || null,
  };
}

function patientUpdateValues(patient: SaveWalkInPatientInput) {
  return {
    first_name: patient.first_name.trim(),
    last_name: patient.last_name?.trim() || null,
    phone: patient.phone?.trim() || null,
    gender: patient.gender,
    date_of_birth: patient.date_of_birth?.trim() || null,
  };
}

async function loadDetail(
  db: DbInstance,
  tenantId: string,
  recordId: string,
): Promise<WalkInDispenseDetail | undefined> {
  const [recordRow] = await db
    .select()
    .from(dispenseRecords)
    .where(
      and(
        eq(dispenseRecords.iq_tenant_id, tenantId),
        eq(dispenseRecords.id, recordId),
        eq(dispenseRecords.walk_in_order, true),
      ),
    )
    .limit(1);

  if (!recordRow?.walk_in_patient_id) return undefined;

  const [patientRow] = await db
    .select()
    .from(walkInPatients)
    .where(
      and(
        eq(walkInPatients.iq_tenant_id, tenantId),
        eq(walkInPatients.id, recordRow.walk_in_patient_id),
      ),
    )
    .limit(1);

  if (!patientRow) return undefined;

  const lineRows = await db
    .select()
    .from(dispenseLineItems)
    .where(
      and(
        eq(dispenseLineItems.iq_tenant_id, tenantId),
        eq(dispenseLineItems.dispense_record_id, recordId),
      ),
    )
    .orderBy(asc(dispenseLineItems.created_at), asc(dispenseLineItems.id));

  return {
    record: mapRecord(recordRow),
    patient: mapPatient(patientRow),
    lines: lineRows.map(mapLine),
  };
}

function parseQueuedDate(value: string | undefined): string | undefined {
  const trimmed = value?.trim();
  if (!trimmed || !/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return undefined;
  return trimmed;
}

async function countLinesByRecordIds(
  db: DbInstance,
  tenantId: string,
  recordIds: string[],
): Promise<Map<string, number>> {
  if (recordIds.length === 0) return new Map();

  const rows = await db
    .select({
      dispense_record_id: dispenseLineItems.dispense_record_id,
      count: sql<number>`count(*)::int`,
    })
    .from(dispenseLineItems)
    .where(
      and(
        eq(dispenseLineItems.iq_tenant_id, tenantId),
        inArray(dispenseLineItems.dispense_record_id, recordIds),
      ),
    )
    .groupBy(dispenseLineItems.dispense_record_id);

  return new Map(rows.map((row) => [row.dispense_record_id, row.count]));
}

export class DrizzleWalkInDispenseRepo implements WalkInDispenseRepo {
  constructor(private readonly db: DbInstance) {}

  async findByRecordId(tenantId: string, recordId: string): Promise<WalkInDispenseDetail | undefined> {
    return loadDetail(this.db, tenantId, recordId);
  }

  async listForQueue(
    tenantId: string,
    options: { queued_from?: string; queued_to?: string } = {},
  ): Promise<WalkInQueueSummary[]> {
    const queuedFrom = parseQueuedDate(options.queued_from);
    const queuedTo = parseQueuedDate(options.queued_to);

    const conditions = [
      eq(dispenseRecords.iq_tenant_id, tenantId),
      eq(dispenseRecords.walk_in_order, true),
    ];
    if (queuedFrom) {
      conditions.push(gte(sql`date(${dispenseRecords.created_at})`, queuedFrom));
    }
    if (queuedTo) {
      conditions.push(lte(sql`date(${dispenseRecords.created_at})`, queuedTo));
    }

    const rows = await this.db
      .select({
        record: dispenseRecords,
        patient: walkInPatients,
      })
      .from(dispenseRecords)
      .innerJoin(
        walkInPatients,
        and(
          eq(walkInPatients.iq_tenant_id, dispenseRecords.iq_tenant_id),
          eq(walkInPatients.id, dispenseRecords.walk_in_patient_id),
        ),
      )
      .where(and(...conditions))
      .orderBy(desc(dispenseRecords.created_at));

    const lineCounts = await countLinesByRecordIds(
      this.db,
      tenantId,
      rows.map((row) => row.record.id),
    );

    return rows.map(({ record, patient }) => {
      const medicineCount = lineCounts.get(record.id) ?? 0;
      return {
        record_id: record.id,
        walk_in_patient_id: patient.id,
        first_name: patient.first_name,
        last_name: patient.last_name,
        phone: patient.phone,
        gender: patient.gender,
        date_of_birth: patient.date_of_birth,
        created_at: record.created_at,
        medicine_count: medicineCount,
        has_dispense: medicineCount > 0,
      };
    });
  }

  async create(tenantId: string, payload: UpsertWalkInDispensePayload): Promise<WalkInDispenseDetail> {
    const linePreview = buildDispenseLineRows(tenantId, "pending", payload.lines);
    const amounts = computeRecordAmounts(
      linePreview.map((row) => ({ line_total: row.line_total as string })),
      payload.discount,
    );

    return this.db.transaction(async (tx) => {
      const [patientRow] = await tx
        .insert(walkInPatients)
        .values(patientInsertValues(tenantId, payload.walk_in_patient))
        .returning();
      if (!patientRow) {
        throw new Error("walk-in patient insert failed");
      }

      const [recordRow] = await tx
        .insert(dispenseRecords)
        .values({
          iq_tenant_id: tenantId,
          walk_in_order: true,
          walk_in_patient_id: patientRow.id,
          visit_id: null,
          patient_id: null,
          opd_prescription_id: null,
          subtotal: amounts.subtotal,
          discount: amounts.discount,
          total_amount: amounts.total_amount,
          notes: payload.notes ?? null,
          created_by: payload.created_by ?? null,
        })
        .returning();
      if (!recordRow) {
        throw new Error("walk-in dispense record insert failed");
      }

      const rowsToInsert = buildDispenseLineRows(tenantId, recordRow.id, payload.lines);
      let lines: DispenseLineItemRecord[] = [];
      if (rowsToInsert.length > 0) {
        const insertedLines = await tx.insert(dispenseLineItems).values(rowsToInsert).returning();
        lines = insertedLines.map(mapLine);
      }

      return {
        record: mapRecord(recordRow),
        patient: mapPatient(patientRow),
        lines,
      };
    });
  }

  async upsert(
    tenantId: string,
    recordId: string,
    payload: UpsertWalkInDispensePayload,
  ): Promise<WalkInDispenseDetail> {
    const linePreview = buildDispenseLineRows(tenantId, recordId, payload.lines);
    const amounts = computeRecordAmounts(
      linePreview.map((row) => ({ line_total: row.line_total as string })),
      payload.discount,
    );

    return this.db.transaction(async (tx) => {
      const [existing] = await tx
        .select()
        .from(dispenseRecords)
        .where(
          and(
            eq(dispenseRecords.iq_tenant_id, tenantId),
            eq(dispenseRecords.id, recordId),
            eq(dispenseRecords.walk_in_order, true),
          ),
        )
        .limit(1);

      if (!existing?.walk_in_patient_id) {
        throw new Error("walk-in dispense record not found");
      }

      const [patientRow] = await tx
        .update(walkInPatients)
        .set(patientUpdateValues(payload.walk_in_patient))
        .where(
          and(
            eq(walkInPatients.iq_tenant_id, tenantId),
            eq(walkInPatients.id, existing.walk_in_patient_id),
          ),
        )
        .returning();
      if (!patientRow) {
        throw new Error("walk-in patient update failed");
      }

      const [recordRow] = await tx
        .update(dispenseRecords)
        .set({
          subtotal: amounts.subtotal,
          discount: normalizeDiscount(payload.discount),
          total_amount: amounts.total_amount,
          notes: payload.notes ?? null,
        })
        .where(
          and(eq(dispenseRecords.iq_tenant_id, tenantId), eq(dispenseRecords.id, recordId)),
        )
        .returning();
      if (!recordRow) {
        throw new Error("walk-in dispense record update failed");
      }

      await tx
        .delete(dispenseLineItems)
        .where(
          and(
            eq(dispenseLineItems.iq_tenant_id, tenantId),
            eq(dispenseLineItems.dispense_record_id, recordId),
          ),
        );

      const rowsToInsert = buildDispenseLineRows(tenantId, recordId, payload.lines);
      let lines: DispenseLineItemRecord[] = [];
      if (rowsToInsert.length > 0) {
        const insertedLines = await tx.insert(dispenseLineItems).values(rowsToInsert).returning();
        lines = insertedLines.map(mapLine);
      }

      return {
        record: mapRecord(recordRow),
        patient: mapPatient(patientRow),
        lines,
      };
    });
  }
}

export function createWalkInDispenseRepo(db: DbInstance): WalkInDispenseRepo {
  return new DrizzleWalkInDispenseRepo(db);
}
