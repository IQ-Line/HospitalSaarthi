import { and, desc, eq, ilike, inArray, or, sql, type DbInstance } from "@hims/ts-sdk-db";
import { count } from "drizzle-orm";
import type {
  DispenseLineItemRecord,
  DispenseRecord,
  DispenseReturnDetail,
  DispenseReturnSearchHit,
  DispenseReturnSummary,
  DispenseReturnVerification,
  PharmacyDispenseStatus,
  QueueProjectionRow,
} from "../domain/pharmacy.types.js";
import { formatDispenseNumber, formatReturnNumber } from "../lib/format-dispense-number.js";
import { isDispenseEligibleForReturn } from "../lib/dispense-return-status.js";
import type {
  DispenseReturnRepo,
  ProcessDispenseReturnPayload,
  SearchDispenseForReturnCriteria,
} from "../ports.js";
import {
  dispense,
  dispenseLineItems,
  dispenseReturn,
  dispenseReturnLineItems,
  queueProjection,
} from "../schema/tables.js";

const ELIGIBLE_STATUSES = ["issued", "partial_issue", "partially_returned"] as const;

function mapRecord(row: typeof dispense.$inferSelect): DispenseRecord {
  return {
    id: row.id,
    iq_tenant_id: row.iq_tenant_id,
    visit_id: row.visit_id,
    patient_id: row.patient_id,
    opd_prescription_id: row.opd_prescription_id,
    department_id: row.department_id,
    branch_id: row.branch_id,
    inventory_store_id: row.inventory_store_id,
    priority: row.priority as DispenseRecord["priority"],
    subtotal: row.subtotal,
    discount: row.discount,
    total_amount: row.total_amount,
    notes: row.notes,
    dispense_status: row.dispense_status as DispenseRecord["dispense_status"],
    dispense_draft_json: row.dispense_draft_json,
    created_at: row.created_at,
    updated_at: row.updated_at,
    created_by: row.created_by,
  };
}

function mapLine(row: typeof dispenseLineItems.$inferSelect): DispenseLineItemRecord {
  return {
    id: row.id,
    iq_tenant_id: row.iq_tenant_id,
    dispense_id: row.dispense_id,
    medicine_id: row.medicine_id ?? null,
    medicine_display_name: row.medicine_display_name,
    opd_prescription_item_id: row.opd_prescription_item_id,
    opd_prescription_line_no: row.opd_prescription_line_no,
    prescribed_quantity: row.prescribed_quantity,
    quantity_dispensed: row.quantity_dispensed,
    quantity_returned: row.quantity_returned ?? "0",
    unit_amount: row.unit_amount,
    line_discount: row.line_discount,
    tax_percent: row.tax_percent,
    tax_amount: row.tax_amount,
    line_total: row.line_total,
    inventory_item_id: row.inventory_item_id ?? null,
    stock_batch_id: row.stock_batch_id,
    is_substitution: row.is_substitution,
    substitute_of_line_id: row.substitute_of_line_id,
    substitution_reason: row.substitution_reason,
    line_remarks: row.line_remarks,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

function mapProjection(row: typeof queueProjection.$inferSelect): QueueProjectionRow {
  return {
    queue_item_id: row.queue_item_id,
    iq_tenant_id: row.iq_tenant_id,
    source_kind: row.source_kind as QueueProjectionRow["source_kind"],
    source_ref_id: row.source_ref_id,
    encounter_id: row.encounter_id,
    patient_id: row.patient_id,
    prescription_id: row.prescription_id,
    doctor_id: row.doctor_id,
    visit_status: row.visit_status,
    prescription_status: row.prescription_status,
    medicine_count: row.medicine_count,
    priority: row.priority as QueueProjectionRow["priority"],
    queued_at: row.queued_at,
    patient_name: row.patient_name,
    uhid: row.uhid,
    phone: row.phone,
    age_years: row.age_years,
    gender: row.gender,
    doctor_name: row.doctor_name,
    formatted_visit_id: row.formatted_visit_id,
    dispense_status: row.dispense_status as PharmacyDispenseStatus,
    context_json: row.context_json,
    last_synced_at: row.last_synced_at,
  };
}

function buildSearchPattern(raw: string | undefined): string | null {
  const trimmed = raw?.trim();
  if (!trimmed) return null;
  return `%${trimmed}%`;
}

function buildUuidPrefixPattern(raw: string | undefined): string | null {
  const trimmed = raw?.trim();
  if (!trimmed || trimmed.length < 4) return null;
  const compact = trimmed.replace(/-/g, "");
  if (!/^[0-9a-f]+$/i.test(compact)) return null;
  return `${compact}%`;
}

function buildSearchConditions(criteria: SearchDispenseForReturnCriteria) {
  const terms = [
    criteria.q,
    criteria.bill_number,
    criteria.dispense_number,
    criteria.prescription_number,
    criteria.uhid,
    criteria.patient_name,
    criteria.mobile,
  ]
    .map((value) => value?.trim())
    .filter((value): value is string => Boolean(value));

  if (terms.length === 0) {
    return null;
  }

  const orConditions = terms.flatMap((term) => {
    const pattern = `%${term}%`;
    const uuidPrefix = buildUuidPrefixPattern(term);
    const fields = [
      ilike(queueProjection.patient_name, pattern),
      ilike(queueProjection.uhid, pattern),
      ilike(queueProjection.phone, pattern),
      ilike(queueProjection.formatted_visit_id, pattern),
      ilike(sql`${dispense.id}::text`, pattern),
      ilike(sql`${dispense.visit_id}::text`, pattern),
      ilike(sql`${dispense.opd_prescription_id}::text`, pattern),
      ilike(sql`${queueProjection.prescription_id}::text`, pattern),
    ];
    if (uuidPrefix) {
      fields.push(
        ilike(sql`replace(${dispense.id}::text, '-', '')`, uuidPrefix),
        ilike(sql`replace(${dispense.visit_id}::text, '-', '')`, uuidPrefix),
        ilike(sql`replace(${dispense.opd_prescription_id}::text, '-', '')`, uuidPrefix),
      );
    }
    return fields;
  });

  return or(...orConditions)!;
}

async function loadReturnDetail(
  db: DbInstance,
  tenantId: string,
  returnId: string,
): Promise<DispenseReturnDetail | undefined> {
  const [header] = await db
    .select()
    .from(dispenseReturn)
    .where(and(eq(dispenseReturn.iq_tenant_id, tenantId), eq(dispenseReturn.id, returnId)))
    .limit(1);
  if (!header) return undefined;

  const [record] = await db
    .select()
    .from(dispense)
    .where(and(eq(dispense.iq_tenant_id, tenantId), eq(dispense.id, header.dispense_id)))
    .limit(1);

  const [projection] = await db
    .select()
    .from(queueProjection)
    .where(
      and(
        eq(queueProjection.iq_tenant_id, tenantId),
        eq(queueProjection.encounter_id, header.visit_id),
      ),
    )
    .limit(1);

  const lineRows = await db
    .select()
    .from(dispenseReturnLineItems)
    .where(
      and(
        eq(dispenseReturnLineItems.iq_tenant_id, tenantId),
        eq(dispenseReturnLineItems.dispense_return_id, returnId),
      ),
    )
    .orderBy(dispenseReturnLineItems.created_at);

  return {
    id: header.id,
    return_number: header.return_number,
    dispense_id: header.dispense_id,
    dispense_number: formatDispenseNumber(header.dispense_id),
    visit_id: header.visit_id,
    patient_id: header.patient_id,
    patient_name: projection?.patient_name ?? null,
    uhid: projection?.uhid ?? null,
    formatted_visit_id: projection?.formatted_visit_id ?? null,
    prescription_id: record?.opd_prescription_id ?? projection?.prescription_id ?? null,
    return_reason: header.return_reason as DispenseReturnDetail["return_reason"],
    remarks: header.remarks,
    verification: header.verification_json as DispenseReturnVerification,
    total_return_amount: header.total_return_amount,
    processed_at: header.processed_at.toISOString(),
    processed_by: header.processed_by,
    processed_by_name: null,
    lines: lineRows.map((line) => ({
      id: line.id,
      dispense_line_item_id: line.dispense_line_item_id,
      medicine_id: line.medicine_id,
      medicine_display_name: line.medicine_display_name,
      stock_batch_id: line.stock_batch_id,
      return_qty: line.return_qty,
      unit_amount: line.unit_amount,
      line_discount: line.line_discount,
      tax_amount: line.tax_amount,
      return_amount: line.return_amount,
    })),
  };
}

export class DrizzleDispenseReturnRepo implements DispenseReturnRepo {
  constructor(private readonly db: DbInstance) {}

  async searchEligibleDispenses(
    tenantId: string,
    criteria: SearchDispenseForReturnCriteria,
    page: number,
    limit: number,
  ): Promise<{ items: DispenseReturnSearchHit[]; total: number }> {
    const searchCondition = buildSearchConditions(criteria);
    if (!searchCondition) {
      return { items: [], total: 0 };
    }

    const baseWhere = and(
      eq(dispense.iq_tenant_id, tenantId),
      inArray(dispense.dispense_status, [...ELIGIBLE_STATUSES]),
      searchCondition,
    );

    const [{ total }] = await this.db
      .select({ total: count() })
      .from(dispense)
      .leftJoin(
        queueProjection,
        and(
          eq(queueProjection.iq_tenant_id, dispense.iq_tenant_id),
          eq(queueProjection.encounter_id, dispense.visit_id),
        ),
      )
      .where(baseWhere);

    const offset = (page - 1) * limit;
    const rows = await this.db
      .select({
        dispense: dispense,
        projection: queueProjection,
      })
      .from(dispense)
      .leftJoin(
        queueProjection,
        and(
          eq(queueProjection.iq_tenant_id, dispense.iq_tenant_id),
          eq(queueProjection.encounter_id, dispense.visit_id),
        ),
      )
      .where(baseWhere)
      .orderBy(desc(dispense.created_at))
      .limit(limit)
      .offset(offset);

    return {
      items: rows.map(({ dispense: record, projection }) => ({
        dispense_id: record.id,
        dispense_number: formatDispenseNumber(record.id),
        visit_id: record.visit_id,
        patient_id: record.patient_id,
        patient_name: projection?.patient_name ?? null,
        uhid: projection?.uhid ?? null,
        phone: projection?.phone ?? null,
        formatted_visit_id: projection?.formatted_visit_id ?? null,
        prescription_id: record.opd_prescription_id ?? projection?.prescription_id ?? null,
        dispense_date: record.created_at.toISOString(),
        dispense_status: record.dispense_status as PharmacyDispenseStatus,
        total_amount: record.total_amount,
        pharmacist_id: record.created_by,
      })),
      total: Number(total),
    };
  }

  async getEligibilityContext(tenantId: string, dispenseId: string) {
    const [recordRow] = await this.db
      .select()
      .from(dispense)
      .where(and(eq(dispense.iq_tenant_id, tenantId), eq(dispense.id, dispenseId)))
      .limit(1);
    if (!recordRow || !isDispenseEligibleForReturn(recordRow.dispense_status)) {
      return undefined;
    }

    const lineRows = await this.db
      .select()
      .from(dispenseLineItems)
      .where(
        and(
          eq(dispenseLineItems.iq_tenant_id, tenantId),
          eq(dispenseLineItems.dispense_id, dispenseId),
        ),
      )
      .orderBy(dispenseLineItems.created_at);

    const [projectionRow] = await this.db
      .select()
      .from(queueProjection)
      .where(
        and(
          eq(queueProjection.iq_tenant_id, tenantId),
          eq(queueProjection.encounter_id, recordRow.visit_id),
        ),
      )
      .limit(1);

    return {
      record: mapRecord(recordRow),
      lines: lineRows.map(mapLine),
      projection: projectionRow ? mapProjection(projectionRow) : undefined,
    };
  }

  async findByIdempotencyKey(
    tenantId: string,
    idempotencyKey: string,
  ): Promise<DispenseReturnDetail | undefined> {
    const [existing] = await this.db
      .select({ id: dispenseReturn.id })
      .from(dispenseReturn)
      .where(
        and(
          eq(dispenseReturn.iq_tenant_id, tenantId),
          eq(dispenseReturn.idempotency_key, idempotencyKey),
        ),
      )
      .limit(1);
    if (!existing) return undefined;
    return loadReturnDetail(this.db, tenantId, existing.id);
  }

  async processReturn(
    tenantId: string,
    payload: ProcessDispenseReturnPayload,
    preparedLines: Array<{
      dispense_line_item_id: string;
      return_qty: number;
      medicine_id: string | null;
      medicine_display_name: string;
      stock_batch_id: string | null;
      unit_amount: string;
      line_discount: string;
      tax_amount: string;
      return_amount: string;
    }>,
    nextDispenseStatus: string,
    updatedLineReturns: Array<{ lineId: string; quantity_returned: string }>,
  ): Promise<DispenseReturnDetail> {
    const totalReturnAmount = preparedLines
      .reduce((sum, line) => sum + Number(line.return_amount), 0)
      .toFixed(4);
    const processedAt = new Date();

    return this.db.transaction(async (tx) => {
      await tx.execute(sql`
        SELECT id FROM pharmacy.dispense
        WHERE iq_tenant_id = ${tenantId}::uuid
          AND id = ${payload.dispense_id}::uuid
        FOR UPDATE
      `);

      const [lockedRecord] = await tx
        .select()
        .from(dispense)
        .where(and(eq(dispense.iq_tenant_id, tenantId), eq(dispense.id, payload.dispense_id)))
        .limit(1);
      if (!lockedRecord) {
        throw new Error("dispense record not found");
      }

      const [{ dailyCount }] = await tx
        .select({
          dailyCount: count(),
        })
        .from(dispenseReturn)
        .where(
          and(
            eq(dispenseReturn.iq_tenant_id, tenantId),
            sql`date(${dispenseReturn.processed_at}) = date(${processedAt.toISOString()}::timestamptz)`,
          ),
        );

      const returnNumber = formatReturnNumber(processedAt, Number(dailyCount) + 1);
      const actorId = payload.processed_by ?? null;

      const [insertedReturn] = await tx
        .insert(dispenseReturn)
        .values({
          iq_tenant_id: tenantId,
          return_number: returnNumber,
          dispense_id: payload.dispense_id,
          visit_id: lockedRecord.visit_id,
          patient_id: lockedRecord.patient_id,
          return_reason: payload.return_reason,
          remarks: payload.remarks ?? null,
          verification_json: payload.verification,
          total_return_amount: totalReturnAmount,
          idempotency_key: payload.idempotency_key ?? null,
          processed_by: actorId,
          processed_at: processedAt,
          created_by: actorId,
          updated_by: actorId,
          updated_at: processedAt,
        })
        .returning();

      if (!insertedReturn) {
        throw new Error("dispense return insert failed");
      }

      if (preparedLines.length > 0) {
        await tx.insert(dispenseReturnLineItems).values(
          preparedLines.map((line) => ({
            iq_tenant_id: tenantId,
            dispense_return_id: insertedReturn.id,
            dispense_line_item_id: line.dispense_line_item_id,
            medicine_id: line.medicine_id,
            medicine_display_name: line.medicine_display_name,
            stock_batch_id: line.stock_batch_id,
            return_qty: String(line.return_qty),
            unit_amount: line.unit_amount,
            line_discount: line.line_discount,
            tax_amount: line.tax_amount,
            return_amount: line.return_amount,
            created_by: actorId,
            updated_by: actorId,
            updated_at: processedAt,
          })),
        );
      }

      for (const lineUpdate of updatedLineReturns) {
        await tx
          .update(dispenseLineItems)
          .set({
            quantity_returned: lineUpdate.quantity_returned,
            updated_at: new Date(),
          })
          .where(
            and(
              eq(dispenseLineItems.iq_tenant_id, tenantId),
              eq(dispenseLineItems.id, lineUpdate.lineId),
            ),
          );
      }

      await tx
        .update(dispense)
        .set({
          dispense_status: nextDispenseStatus,
          updated_at: new Date(),
        })
        .where(and(eq(dispense.iq_tenant_id, tenantId), eq(dispense.id, payload.dispense_id)));

      const detail = await loadReturnDetail(tx as unknown as DbInstance, tenantId, insertedReturn.id);
      if (!detail) {
        throw new Error("return detail load failed");
      }
      return detail;
    });
  }

  async listReturns(
    tenantId: string,
    options: { page: number; limit: number; search?: string },
  ): Promise<{ items: DispenseReturnSummary[]; total: number }> {
    const searchPattern = buildSearchPattern(options.search);
    const conditions = [eq(dispenseReturn.iq_tenant_id, tenantId)];
    if (searchPattern) {
      conditions.push(
        or(
          ilike(dispenseReturn.return_number, searchPattern),
          ilike(sql`${dispenseReturn.dispense_id}::text`, searchPattern),
          ilike(queueProjection.patient_name, searchPattern),
          ilike(queueProjection.uhid, searchPattern),
        )!,
      );
    }

    const whereClause = and(...conditions);

    const [{ total }] = await this.db
      .select({ total: count() })
      .from(dispenseReturn)
      .leftJoin(
        queueProjection,
        and(
          eq(queueProjection.iq_tenant_id, dispenseReturn.iq_tenant_id),
          eq(queueProjection.encounter_id, dispenseReturn.visit_id),
        ),
      )
      .where(whereClause);

    const offset = (options.page - 1) * options.limit;
    const rows = await this.db
      .select({
        header: dispenseReturn,
        projection: queueProjection,
      })
      .from(dispenseReturn)
      .leftJoin(
        queueProjection,
        and(
          eq(queueProjection.iq_tenant_id, dispenseReturn.iq_tenant_id),
          eq(queueProjection.encounter_id, dispenseReturn.visit_id),
        ),
      )
      .where(whereClause)
      .orderBy(desc(dispenseReturn.processed_at))
      .limit(options.limit)
      .offset(offset);

    return {
      items: rows.map(({ header, projection }) => ({
        id: header.id,
        return_number: header.return_number,
        dispense_id: header.dispense_id,
        dispense_number: formatDispenseNumber(header.dispense_id),
        return_reason: header.return_reason as DispenseReturnSummary["return_reason"],
        total_return_amount: header.total_return_amount,
        processed_at: header.processed_at.toISOString(),
        patient_name: projection?.patient_name ?? null,
        uhid: projection?.uhid ?? null,
        formatted_visit_id: projection?.formatted_visit_id ?? null,
      })),
      total: Number(total),
    };
  }

  async findReturnById(tenantId: string, returnId: string): Promise<DispenseReturnDetail | undefined> {
    return loadReturnDetail(this.db, tenantId, returnId);
  }
}

export function createDispenseReturnRepo(db: DbInstance): DispenseReturnRepo {
  return new DrizzleDispenseReturnRepo(db);
}
