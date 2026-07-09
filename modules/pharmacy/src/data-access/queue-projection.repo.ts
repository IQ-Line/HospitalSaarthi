import { and, desc, eq, ilike, or, type DbInstance } from "@hims/ts-sdk-db";
import { count, gte, lte, sql } from "drizzle-orm";
import type {
  PharmacyDispenseStatus,
  PharmacyQueueSourceKind,
  QueueProjectionRow,
  QueueProjectionUpsertInput,
} from "../domain/pharmacy.types.js";
import type { PharmacyQueueStatusFilter } from "../lib/pharmacy-queue-filter.js";
import { queueProjection } from "../schema/tables.js";

function parseQueuedDate(raw: string | undefined): string | null {
  if (!raw?.trim()) return null;
  return raw.trim();
}

function mapRow(row: typeof queueProjection.$inferSelect): QueueProjectionRow {
  return {
    queue_item_id: row.queue_item_id,
    iq_tenant_id: row.iq_tenant_id,
    source_kind: row.source_kind as PharmacyQueueSourceKind,
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

function buildSearchCondition(query: string) {
  const pattern = `%${query}%`;
  const compactQuery = query.replace(/-/g, "");
  const uuidPrefixPattern =
    query.length >= 8 && /^[0-9a-f-]+$/.test(query) ? `${compactQuery}%` : null;

  const fields = [
    ilike(queueProjection.patient_name, pattern),
    ilike(queueProjection.uhid, pattern),
    ilike(queueProjection.phone, pattern),
    ilike(queueProjection.doctor_name, pattern),
    ilike(queueProjection.formatted_visit_id, pattern),
    ilike(sql`${queueProjection.encounter_id}::text`, pattern),
    ilike(sql`${queueProjection.prescription_id}::text`, pattern),
    ilike(sql`${queueProjection.patient_id}::text`, pattern),
    ilike(sql`${queueProjection.source_ref_id}::text`, pattern),
  ];

  if (uuidPrefixPattern) {
    fields.push(
      ilike(sql`replace(${queueProjection.encounter_id}::text, '-', '')`, uuidPrefixPattern),
      ilike(sql`replace(${queueProjection.prescription_id}::text, '-', '')`, uuidPrefixPattern),
      ilike(sql`replace(${queueProjection.source_ref_id}::text, '-', '')`, uuidPrefixPattern),
    );
  }

  return or(...fields)!;
}

export class DrizzleQueueProjectionRepo {
  constructor(private readonly db: DbInstance) {}

  async listForQueue(
    tenantId: string,
    options: {
      page: number;
      limit: number;
      queued_from?: string;
      queued_to?: string;
      search?: string;
      status?: PharmacyQueueStatusFilter;
      source_kind?: PharmacyQueueSourceKind | "all";
    },
  ): Promise<{ items: QueueProjectionRow[]; total: number }> {
    const conditions = [eq(queueProjection.iq_tenant_id, tenantId)];

    const sourceKind = options.source_kind ?? "opd";
    if (sourceKind !== "all") {
      conditions.push(eq(queueProjection.source_kind, sourceKind));
    }

    const queuedFrom = parseQueuedDate(options.queued_from);
    const queuedTo = parseQueuedDate(options.queued_to);
    if (queuedFrom) {
      conditions.push(gte(sql`date(${queueProjection.queued_at})`, queuedFrom));
    }
    if (queuedTo) {
      conditions.push(lte(sql`date(${queueProjection.queued_at})`, queuedTo));
    }

    if (options.status && options.status !== "all") {
      conditions.push(eq(queueProjection.dispense_status, options.status));
    }

    const search = options.search?.trim().toLowerCase() ?? "";
    if (search.length > 0) {
      conditions.push(buildSearchCondition(search));
    }

    const whereClause = and(...conditions);
    const offset = (options.page - 1) * options.limit;

    const [totalRow] = await this.db
      .select({ total: count() })
      .from(queueProjection)
      .where(whereClause);

    const rows = await this.db
      .select()
      .from(queueProjection)
      .where(whereClause)
      .orderBy(desc(queueProjection.queued_at), desc(queueProjection.queue_item_id))
      .limit(options.limit)
      .offset(offset);

    return {
      items: rows.map(mapRow),
      total: Number(totalRow?.total ?? 0),
    };
  }

  async upsert(tenantId: string, input: QueueProjectionUpsertInput): Promise<QueueProjectionRow> {
    const now = new Date();
    const sourceKind = input.source_kind ?? "opd";
    const [row] = await this.db
      .insert(queueProjection)
      .values({
        iq_tenant_id: tenantId,
        source_kind: sourceKind,
        source_ref_id: input.source_ref_id,
        encounter_id: input.encounter_id,
        patient_id: input.patient_id,
        prescription_id: input.prescription_id,
        doctor_id: input.doctor_id,
        visit_status: input.visit_status,
        prescription_status: input.prescription_status,
        medicine_count: input.medicine_count,
        priority: input.priority ?? "routine",
        queued_at: input.queued_at,
        patient_name: input.patient_name,
        uhid: input.uhid,
        phone: input.phone,
        age_years: input.age_years,
        gender: input.gender,
        doctor_name: input.doctor_name,
        formatted_visit_id: input.formatted_visit_id,
        dispense_status: input.dispense_status,
        context_json: input.context_json ?? {},
        last_synced_at: now,
      })
      .onConflictDoUpdate({
        target: [
          queueProjection.iq_tenant_id,
          queueProjection.source_kind,
          queueProjection.source_ref_id,
        ],
        set: {
          encounter_id: input.encounter_id,
          patient_id: input.patient_id,
          prescription_id: input.prescription_id,
          doctor_id: input.doctor_id,
          visit_status: input.visit_status,
          prescription_status: input.prescription_status,
          medicine_count: input.medicine_count,
          priority: input.priority ?? "routine",
          queued_at: input.queued_at,
          patient_name: input.patient_name,
          uhid: input.uhid,
          phone: input.phone,
          age_years: input.age_years,
          gender: input.gender,
          doctor_name: input.doctor_name,
          formatted_visit_id: input.formatted_visit_id,
          dispense_status: input.dispense_status,
          context_json: input.context_json ?? {},
          last_synced_at: now,
        },
      })
      .returning();

    if (!row) {
      throw new Error("queue projection upsert failed");
    }
    return mapRow(row);
  }

  async updateDispenseStatus(
    tenantId: string,
    encounterId: string,
    dispenseStatus: PharmacyDispenseStatus,
    sourceKind: PharmacyQueueSourceKind = "opd",
  ): Promise<void> {
    await this.db
      .update(queueProjection)
      .set({
        dispense_status: dispenseStatus,
        last_synced_at: new Date(),
      })
      .where(
        and(
          eq(queueProjection.iq_tenant_id, tenantId),
          eq(queueProjection.source_kind, sourceKind),
          eq(queueProjection.encounter_id, encounterId),
        ),
      );
  }

  async deleteByEncounterId(
    tenantId: string,
    encounterId: string,
    sourceKind: PharmacyQueueSourceKind = "opd",
  ): Promise<void> {
    await this.db
      .delete(queueProjection)
      .where(
        and(
          eq(queueProjection.iq_tenant_id, tenantId),
          eq(queueProjection.source_kind, sourceKind),
          eq(queueProjection.encounter_id, encounterId),
        ),
      );
  }

  /** OPD dispense workspace still keys by registration visit id. */
  async deleteByVisitId(tenantId: string, visitId: string): Promise<void> {
    await this.deleteByEncounterId(tenantId, visitId, "opd");
  }

  async findByEncounterId(
    tenantId: string,
    encounterId: string,
    sourceKind: PharmacyQueueSourceKind = "opd",
  ): Promise<QueueProjectionRow | undefined> {
    const [row] = await this.db
      .select()
      .from(queueProjection)
      .where(
        and(
          eq(queueProjection.iq_tenant_id, tenantId),
          eq(queueProjection.source_kind, sourceKind),
          eq(queueProjection.encounter_id, encounterId),
        ),
      )
      .limit(1);

    return row ? mapRow(row) : undefined;
  }

  async findByVisitId(
    tenantId: string,
    visitId: string,
  ): Promise<QueueProjectionRow | undefined> {
    return this.findByEncounterId(tenantId, visitId, "opd");
  }
}

export function createQueueProjectionRepo(db: DbInstance): DrizzleQueueProjectionRepo {
  return new DrizzleQueueProjectionRepo(db);
}

/** @deprecated Use `createQueueProjectionRepo`. */
export const createOpdQueueProjectionRepo = createQueueProjectionRepo;

/** @deprecated Use `DrizzleQueueProjectionRepo`. */
export type DrizzleOpdQueueProjectionRepo = DrizzleQueueProjectionRepo;
