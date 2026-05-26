import type { DbInstance } from "@hims/ts-sdk-db";
import { and, eq } from "@hims/ts-sdk-db";
import { recordBundleManifests } from "../schema/tables.js";
import type { BundleManifestRepo } from "../ports.js";
import type {
  BundleManifest,
  CreateBundleManifestData,
} from "../domain/bundle-manifest.js";

export class DrizzleBundleManifestRepo implements BundleManifestRepo {
  constructor(private db: DbInstance) {}

  async findByCareContext(
    tenantId: string,
    careContextId: string,
  ): Promise<BundleManifest[]> {
    const rows = await this.db
      .select()
      .from(recordBundleManifests)
      .where(
        and(
          eq(recordBundleManifests.iq_tenant_id, tenantId),
          eq(recordBundleManifests.care_context_id, careContextId),
        ),
      )
      .orderBy(recordBundleManifests.stored_at);
    return rows as BundleManifest[];
  }

  async findById(
    tenantId: string,
    id: string,
  ): Promise<BundleManifest | null> {
    const rows = await this.db
      .select()
      .from(recordBundleManifests)
      .where(
        and(
          eq(recordBundleManifests.iq_tenant_id, tenantId),
          eq(recordBundleManifests.id, id),
        ),
      );
    return (rows[0] as BundleManifest) ?? null;
  }

  async create(data: CreateBundleManifestData): Promise<BundleManifest> {
    const rows = await this.db
      .insert(recordBundleManifests)
      .values({
        iq_tenant_id: data.iq_tenant_id,
        care_context_id: data.care_context_id,
        bundle_kind: data.bundle_kind,
        fhir_profile_url: data.fhir_profile_url,
        fhir_profile_version: data.fhir_profile_version,
        producer_kind: data.producer_kind,
        producer_id: data.producer_id,
        bundle_storage_id: data.bundle_storage_id,
        bundle_size_bytes: data.bundle_size_bytes,
        bundle_hash: data.bundle_hash,
        produced_at: data.produced_at,
        received_at: data.received_at ?? null,
      })
      .returning();
    return rows[0] as BundleManifest;
  }
}
