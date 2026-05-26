import type { DbInstance } from "@hims/ts-sdk-db";
import { and, eq } from "@hims/ts-sdk-db";
import { bundleStorage } from "../schema/tables.js";
import type { BundleStorageRepo } from "../ports.js";

export class DrizzleBundleStorageRepo implements BundleStorageRepo {
  constructor(private db: DbInstance) {}

  async findById(
    tenantId: string,
    id: string,
  ): Promise<{ bundleJson: Record<string, unknown> } | null> {
    const rows = await this.db
      .select({
        bundleJson: bundleStorage.bundle_jsonb,
      })
      .from(bundleStorage)
      .where(
        and(
          eq(bundleStorage.iq_tenant_id, tenantId),
          eq(bundleStorage.id, id),
        ),
      );
    const row = rows[0];
    if (!row) return null;
    return { bundleJson: row.bundleJson as Record<string, unknown> };
  }

  async insert(data: {
    iqTenantId: string;
    bundleJson: Record<string, unknown>;
  }): Promise<{ id: string }> {
    const rows = await this.db
      .insert(bundleStorage)
      .values({
        iq_tenant_id: data.iqTenantId,
        bundle_jsonb: data.bundleJson,
      })
      .returning({ id: bundleStorage.id });
    const row = rows[0];
    if (!row) throw new Error("insert returned no rows");
    return row;
  }
}
