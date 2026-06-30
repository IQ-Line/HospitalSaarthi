import type { DbInstance } from "@hims/ts-sdk-db";
import { and, eq } from "@hims/ts-sdk-db";
import { bundles } from "../schema/tables.js";
import type { BundleRepo, BundleRow } from "../ports.js";
import type { CreateBundleData } from "../domain/bundle.js";

export class DrizzleBundleRepo implements BundleRepo {
  constructor(private db: DbInstance) {}

  async insert(data: CreateBundleData & { iqTenantId: string }): Promise<BundleRow> {
    const rows = await this.db
      .insert(bundles)
      .values({
        iq_tenant_id: data.iqTenantId,
        care_context_id: data.care_context_id,
        bundle_kind: data.bundle_kind,
        fhir_profile_url: data.fhir_profile_url,
        fhir_profile_version: data.fhir_profile_version,
        producer_kind: data.producer_kind,
        producer_id: data.producer_id,
        bundle_json: data.bundle_json,
        bundle_size_bytes: data.bundle_size_bytes,
        produced_at: data.produced_at,
      })
      .returning();
    return rows[0] as BundleRow;
  }

  async findById(tenantId: string, id: string): Promise<BundleRow | null> {
    const rows = await this.db
      .select()
      .from(bundles)
      .where(and(eq(bundles.iq_tenant_id, tenantId), eq(bundles.id, id)));
    return (rows[0] as BundleRow) ?? null;
  }

  async findByCareContextId(tenantId: string, careContextId: string): Promise<BundleRow[]> {
    const rows = await this.db
      .select()
      .from(bundles)
      .where(
        and(eq(bundles.iq_tenant_id, tenantId), eq(bundles.care_context_id, careContextId)),
      );
    return rows as BundleRow[];
  }
}
