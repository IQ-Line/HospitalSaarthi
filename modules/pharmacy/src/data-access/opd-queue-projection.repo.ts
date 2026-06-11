import { and, desc, eq, ilike, or, type DbInstance } from "@hims/ts-sdk-db";
import { count, gte, lte, sql } from "drizzle-orm";
import type {
  OpdQueueProjectionRow,
  OpdQueueProjectionUpsertInput,
  PharmacyDispenseStatus,
} from "../domain/pharmacy.types.js";
import type { PharmacyQueueStatusFilter } from "../lib/pharmacy-queue-filter.js";
import { opdQueueProjection } from "../schema/tables.js";

function parseQueuedDate(raw: string | undefined): string | null {
  if (!raw?.trim()) return null;
  return raw.trim();
}

function mapRow(row: typeof opdQueueProjection.$inferSelect): OpdQueueProjectionRow {
  return {
    visit_id: row.visit_id,
    iq_tenant_id: row.iq_tenant_id,
    patient_id: row.patient_id,
    prescription_id: row.prescription_id,
    doctor_id: row.doctor_id,
    visit_status: row.visit_status,
    prescription_status: row.prescription_status,
    medicine_count: row.medicine_count,
    queued_at: row.queued_at,
    patient_name: row.patient_name,
    uhid: row.uhid,
    phone: row.phone,
    age_years: row.age_years,
    gender: row.gender,
    doctor_name: row.doctor_name,
    formatted_visit_id: row.formatted_visit_id,
    dispense_status: row.dispense_status as PharmacyDispenseStatus,
    last_synced_at: row.last_synced_at,
  };
}

function buildSearchCondition(query: string) {
  const pattern = `%${query}%`;
  const compactQuery = query.replace(/-/g, "");
  const uuidPrefixPattern =
    query.length >= 8 && /^[0-9a-f-]+$/.test(query) ? `${compactQuery}%` : null;

  const fields = [
    ilike(opdQueueProjection.patient_name, pattern),
    ilike(opdQueueProjection.uhid, pattern),
    ilike(opdQueueProjection.phone, pattern),
    ilike(opdQueueProjection.doctor_name, pattern),
    ilike(opdQueueProjection.formatted_visit_id, pattern),
    ilike(sql`${opdQueueProjection.visit_id}::text`, pattern),
    ilike(sql`${opdQueueProjection.prescription_id}::text`, pattern),
    ilike(sql`${opdQueueProjection.patient_id}::text`, pattern),
  ];

  if (uuidPrefixPattern) {
    fields.push(
      ilike(sql`replace(${opdQueueProjection.visit_id}::text, '-', '')`, uuidPrefixPattern),
      ilike(
        sql`replace(${opdQueueProjection.prescription_id}::text, '-', '')`,
        uuidPrefixPattern,
      ),
    );
  }

  return or(...fields)!;
}

export class DrizzleOpdQueueProjectionRepo {
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
    },
  ): Promise<{ items: OpdQueueProjectionRow[]; total: number }> {
    const conditions = [eq(opdQueueProjection.iq_tenant_id, tenantId)];

    const queuedFrom = parseQueuedDate(options.queued_from);
    const queuedTo = parseQueuedDate(options.queued_to);
    if (queuedFrom) {
      conditions.push(gte(sql`date(${opdQueueProjection.queued_at})`, queuedFrom));
    }
    if (queuedTo) {
      conditions.push(lte(sql`date(${opdQueueProjection.queued_at})`, queuedTo));
    }

    if (options.status && options.status !== "all") {
      conditions.push(eq(opdQueueProjection.dispense_status, options.status));
    }

    const search = options.search?.trim().toLowerCase() ?? "";
    if (search.length > 0) {
      conditions.push(buildSearchCondition(search));
    }

    const whereClause = and(...conditions);
    const offset = (options.page - 1) * options.limit;

    const [totalRow] = await this.db
      .select({ total: count() })
      .from(opdQueueProjection)
      .where(whereClause);

    const rows = await this.db
      .select()
      .from(opdQueueProjection)
      .where(whereClause)
      .orderBy(desc(opdQueueProjection.queued_at), desc(opdQueueProjection.visit_id))
      .limit(options.limit)
      .offset(offset);

    return {
      items: rows.map(mapRow),
      total: Number(totalRow?.total ?? 0),
    };
  }

  async upsert(tenantId: string, input: OpdQueueProjectionUpsertInput): Promise<OpdQueueProjectionRow> {
    const now = new Date();
    const [row] = await this.db
      .insert(opdQueueProjection)
      .values({
        visit_id: input.visit_id,
        iq_tenant_id: tenantId,
        patient_id: input.patient_id,
        prescription_id: input.prescription_id,
        doctor_id: input.doctor_id,
        visit_status: input.visit_status,
        prescription_status: input.prescription_status,
        medicine_count: input.medicine_count,
        queued_at: input.queued_at,
        patient_name: input.patient_name,
        uhid: input.uhid,
        phone: input.phone,
        age_years: input.age_years,
        gender: input.gender,
        doctor_name: input.doctor_name,
        formatted_visit_id: input.formatted_visit_id,
        dispense_status: input.dispense_status,
        last_synced_at: now,
      })
      .onConflictDoUpdate({
        target: [opdQueueProjection.iq_tenant_id, opdQueueProjection.visit_id],
        set: {
          patient_id: input.patient_id,
          prescription_id: input.prescription_id,
          doctor_id: input.doctor_id,
          visit_status: input.visit_status,
          prescription_status: input.prescription_status,
          medicine_count: input.medicine_count,
          queued_at: input.queued_at,
          patient_name: input.patient_name,
          uhid: input.uhid,
          phone: input.phone,
          age_years: input.age_years,
          gender: input.gender,
          doctor_name: input.doctor_name,
          formatted_visit_id: input.formatted_visit_id,
          dispense_status: input.dispense_status,
          last_synced_at: now,
        },
      })
      .returning();

    if (!row) {
      throw new Error("opd queue projection upsert failed");
    }
    return mapRow(row);
  }

  async updateDispenseStatus(
    tenantId: string,
    visitId: string,
    dispenseStatus: PharmacyDispenseStatus,
  ): Promise<void> {
    await this.db
      .update(opdQueueProjection)
      .set({
        dispense_status: dispenseStatus,
        last_synced_at: new Date(),
      })
      .where(
        and(
          eq(opdQueueProjection.iq_tenant_id, tenantId),
          eq(opdQueueProjection.visit_id, visitId),
        ),
      );
  }

  async deleteByVisitId(tenantId: string, visitId: string): Promise<void> {
    await this.db
      .delete(opdQueueProjection)
      .where(
        and(
          eq(opdQueueProjection.iq_tenant_id, tenantId),
          eq(opdQueueProjection.visit_id, visitId),
        ),
      );
  }

  async findByVisitId(
    tenantId: string,
    visitId: string,
  ): Promise<OpdQueueProjectionRow | undefined> {
    const [row] = await this.db
      .select()
      .from(opdQueueProjection)
      .where(
        and(
          eq(opdQueueProjection.iq_tenant_id, tenantId),
          eq(opdQueueProjection.visit_id, visitId),
        ),
      )
      .limit(1);

    return row ? mapRow(row) : undefined;
  }
}

export function createOpdQueueProjectionRepo(db: DbInstance): DrizzleOpdQueueProjectionRepo {
  return new DrizzleOpdQueueProjectionRepo(db);
}
