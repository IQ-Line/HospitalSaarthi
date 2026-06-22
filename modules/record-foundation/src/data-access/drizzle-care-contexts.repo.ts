import type { DbInstance } from "@hims/ts-sdk-db";
import { and, eq, sql } from "@hims/ts-sdk-db";
import { careContexts } from "../schema/tables.js";
import type { CareContextRepo, CareContextRow, CareContextSourceKey } from "../ports.js";
import type { CareContextFilters, CreateCareContextData } from "../domain/care-context.js";

const MAX_LIST_LIMIT = 200;

export class DrizzleCareContextRepo implements CareContextRepo {
  constructor(private db: DbInstance) {}

  async findAll(
    tenantId: string,
    filters?: CareContextFilters,
  ): Promise<{ data: CareContextRow[]; total: number }> {
    const conditions = [eq(careContexts.iq_tenant_id, tenantId)];

    if (filters) {
      if (filters.patient_id) {
        conditions.push(eq(careContexts.patient_id, filters.patient_id));
      }
      if (filters.status) {
        conditions.push(eq(careContexts.status, filters.status));
      }
    }

    const where = and(...conditions);

    // Pagination is OPT-IN: omitting `limit` returns ALL matching rows (the prior
    // contract — no silent truncation for consumers that need completeness). When
    // `limit` is set we clamp it and page via `offset`. A (period_start, id)
    // tie-break keeps paging stable when many contexts share a period_start.
    const limit =
      filters?.limit !== undefined && Number.isFinite(filters.limit)
        ? clampLimit(filters.limit)
        : null;
    const offset = filters?.offset && filters.offset > 0 ? Math.trunc(filters.offset) : 0;

    const dataQuery = this.db
      .select()
      .from(careContexts)
      .where(where)
      .orderBy(careContexts.period_start, careContexts.id);

    const [data, countResult] = await Promise.all([
      limit !== null ? dataQuery.limit(limit).offset(offset) : dataQuery,
      // True COUNT(*) — not a second full id-scan whose row-count we re-counted.
      this.db.select({ count: sql<number>`count(*)::int` }).from(careContexts).where(where),
    ]);

    return {
      data: data as CareContextRow[],
      total: Number(countResult[0]?.count ?? 0),
    };
  }

  async findById(tenantId: string, id: string): Promise<CareContextRow | null> {
    const rows = await this.db
      .select()
      .from(careContexts)
      .where(and(eq(careContexts.iq_tenant_id, tenantId), eq(careContexts.id, id)));
    return (rows[0] as CareContextRow) ?? null;
  }

  async findBySourceRecordId(
    tenantId: string,
    sourceRecordId: string,
  ): Promise<CareContextRow | null> {
    const rows = await this.db
      .select()
      .from(careContexts)
      .where(
        and(
          eq(careContexts.iq_tenant_id, tenantId),
          eq(careContexts.source_record_id, sourceRecordId),
        ),
      );
    return (rows[0] as CareContextRow) ?? null;
  }

  async findBySource(
    tenantId: string,
    key: CareContextSourceKey,
  ): Promise<CareContextRow | null> {
    const rows = await this.db
      .select()
      .from(careContexts)
      .where(
        and(
          eq(careContexts.iq_tenant_id, tenantId),
          eq(careContexts.source_origin, key.source_origin),
          eq(careContexts.source_system_id, key.source_system_id),
          eq(careContexts.source_record_type, key.source_record_type),
          eq(careContexts.source_record_id, key.source_record_id),
        ),
      );
    return (rows[0] as CareContextRow) ?? null;
  }

  async insert(data: CreateCareContextData & { iqTenantId: string }): Promise<CareContextRow> {
    const rows = await this.db
      .insert(careContexts)
      .values({
        iq_tenant_id: data.iqTenantId,
        patient_id: data.patient_id,
        source_origin: data.source_origin,
        source_system_id: data.source_system_id,
        source_record_type: data.source_record_type,
        source_record_id: data.source_record_id ?? null,
        encounter_id: data.encounter_id ?? null,
        display: data.display,
        period_start: data.period_start,
        period_end: data.period_end ?? null,
        status: data.status ?? "active",
        created_by: data.created_by ?? null,
        updated_by: data.created_by ?? null,
      })
      .returning();
    return rows[0] as CareContextRow;
  }
}

/** Clamp a caller-supplied limit into [1, MAX_LIST_LIMIT]. */
function clampLimit(limit: number): number {
  if (limit < 1) return 1;
  return Math.min(Math.trunc(limit), MAX_LIST_LIMIT);
}
