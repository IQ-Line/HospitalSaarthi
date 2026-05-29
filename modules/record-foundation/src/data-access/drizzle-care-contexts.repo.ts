import type { DbInstance } from "@hims/ts-sdk-db";
import { and, eq } from "@hims/ts-sdk-db";
import { careContexts } from "../schema/tables.js";
import type { CareContextRepo, CareContextRow } from "../ports.js";
import type { CareContextFilters, CreateCareContextData } from "../domain/care-context.js";

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

    const [data, countResult] = await Promise.all([
      this.db.select().from(careContexts).where(where).orderBy(careContexts.period_start),
      this.db.select({ count: careContexts.id }).from(careContexts).where(where),
    ]);

    return {
      data: data as CareContextRow[],
      total: countResult.length,
    };
  }

  async findById(tenantId: string, id: string): Promise<CareContextRow | null> {
    const rows = await this.db
      .select()
      .from(careContexts)
      .where(and(eq(careContexts.iq_tenant_id, tenantId), eq(careContexts.id, id)));
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
