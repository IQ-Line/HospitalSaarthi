import type { DbInstance } from "@hims/ts-sdk-db";
import { and, eq, inArray, sql } from "@hims/ts-sdk-db";
import { careContexts } from "../schema/tables.js";
import type { CareContextRepo } from "../ports.js";
import type {
  CareContext,
  CreateCareContextData,
  CareContextFilters,
} from "../domain/care-context.js";

export class DrizzleCareContextRepo implements CareContextRepo {
  constructor(private db: DbInstance) {}

  async findAll(
    tenantId: string,
    filters: CareContextFilters,
  ): Promise<{ data: CareContext[]; total: number }> {
    const conditions = [eq(careContexts.iq_tenant_id, tenantId)];

    conditions.push(eq(careContexts.patient_id, filters.patient_id));

    if (filters.linked !== undefined) {
      if (filters.linked) {
        conditions.push(eq(careContexts.abha_linkage_status, "linked"));
      } else {
        conditions.push(
          sql`${careContexts.abha_linkage_status} != 'linked'`,
        );
      }
    }

    if (filters.status) {
      conditions.push(eq(careContexts.status, filters.status));
    }

    if (filters.source_origin) {
      conditions.push(eq(careContexts.source_origin, filters.source_origin));
    }

    if (filters.source_record_type) {
      conditions.push(
        eq(careContexts.source_record_type, filters.source_record_type),
      );
    }

    if (filters.abha_linkage_status) {
      conditions.push(
        eq(careContexts.abha_linkage_status, filters.abha_linkage_status),
      );
    }

    const where = and(...conditions);

    const [data, countResult] = await Promise.all([
      this.db
        .select()
        .from(careContexts)
        .where(where)
        .orderBy(careContexts.period_start),
      this.db
        .select({ count: sql<number>`count(*)` })
        .from(careContexts)
        .where(where),
    ]);

    return {
      data: data as CareContext[],
      total: Number(countResult[0]?.count ?? 0),
    };
  }

  async findById(
    tenantId: string,
    id: string,
  ): Promise<CareContext | null> {
    const rows = await this.db
      .select()
      .from(careContexts)
      .where(
        and(eq(careContexts.iq_tenant_id, tenantId), eq(careContexts.id, id)),
      );
    return (rows[0] as CareContext) ?? null;
  }

  async create(data: CreateCareContextData): Promise<CareContext> {
    const rows = await this.db
      .insert(careContexts)
      .values({
        iq_tenant_id: data.iq_tenant_id,
        patient_id: data.patient_id,
        source_origin: data.source_origin,
        source_system_id: data.source_system_id,
        source_record_type: data.source_record_type,
        source_record_id: data.source_record_id ?? null,
        encounter_id: data.encounter_id ?? null,
        display: data.display,
        period_start: data.period_start,
        period_end: data.period_end ?? null,
        sensitivity_labels: data.sensitivity_labels ?? null,
        created_by: data.created_by ?? null,
        updated_by: data.created_by ?? null,
      })
      .returning();
    return rows[0] as CareContext;
  }

  async updateLinkage(
    tenantId: string,
    id: string,
    abhaLinkageStatus: string,
    abdmReferenceNumber?: string,
    linkedAt?: string,
  ): Promise<CareContext | null> {
    const values: Record<string, unknown> = {
      abha_linkage_status: abhaLinkageStatus,
      updated_at: new Date(),
    };

    if (abdmReferenceNumber !== undefined) {
      values["abdm_reference_number"] = abdmReferenceNumber;
    }

    if (linkedAt !== undefined) {
      values["linked_at"] = linkedAt;
    } else if (abhaLinkageStatus === "linked") {
      values["linked_at"] = new Date();
    }

    const rows = await this.db
      .update(careContexts)
      .set(values)
      .where(
        and(eq(careContexts.iq_tenant_id, tenantId), eq(careContexts.id, id)),
      )
      .returning();
    return (rows[0] as CareContext) ?? null;
  }

  async bulkUpdateLinkage(
    tenantId: string,
    updates: Array<{
      careContextId: string;
      abhaLinkageStatus: string;
      abdmReferenceNumber?: string;
      linkedAt?: string;
    }>,
  ): Promise<number> {
    const ids = updates.map((u) => u.careContextId);
    const rows = await this.db
      .select({ id: careContexts.id })
      .from(careContexts)
      .where(
        and(
          eq(careContexts.iq_tenant_id, tenantId),
          inArray(careContexts.id, ids),
        ),
      );

    const existingIds = new Set(rows.map((r) => r.id));
    let updatedCount = 0;

    for (const update of updates) {
      if (!existingIds.has(update.careContextId)) continue;

      await this.updateLinkage(
        tenantId,
        update.careContextId,
        update.abhaLinkageStatus,
        update.abdmReferenceNumber,
        update.linkedAt,
      );
      updatedCount++;
    }

    return updatedCount;
  }
}
