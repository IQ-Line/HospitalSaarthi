import { and, eq, type DbInstance, type SQL } from "@hims/ts-sdk-db";
import type { TenantApiKeyRepo } from "../ports.js";
import type {
  TenantApiKey,
  CreateTenantApiKeyData,
  UpdateTenantApiKeyStatusData,
  TenantApiKeyFilters,
} from "../domain/tenant-api-key.types.js";
import { tenantApiKeys } from "../schema/tables.js";
import { omitUndefined } from "./utils.js";

function toTenantApiKey(row: typeof tenantApiKeys.$inferSelect): TenantApiKey {
  return {
    api_key_id: row.api_key_id,
    iq_tenant_id: row.iq_tenant_id,
    key_prefix: row.key_prefix,
    label: row.label,
    purpose: row.purpose as TenantApiKey["purpose"],
    environment: row.environment as TenantApiKey["environment"],
    status: row.status as TenantApiKey["status"],
    expires_at: row.expires_at?.toISOString() ?? null,
    last_used_at: row.last_used_at?.toISOString() ?? null,
    created_at: row.created_at.toISOString(),
    updated_at: row.updated_at.toISOString(),
    created_by: row.created_by,
    updated_by: row.updated_by,
  };
}

export class DrizzleTenantApiKeyRepo implements TenantApiKeyRepo {
  constructor(private readonly db: DbInstance) {}

  async findAll(filters: TenantApiKeyFilters): Promise<TenantApiKey[]> {
    const conditions: SQL[] = [eq(tenantApiKeys.iq_tenant_id, filters.iq_tenant_id)];
    if (filters.status !== undefined) {
      conditions.push(eq(tenantApiKeys.status, filters.status));
    }
    if (filters.purpose !== undefined) {
      conditions.push(eq(tenantApiKeys.purpose, filters.purpose));
    }

    const rows = await this.db
      .select()
      .from(tenantApiKeys)
      .where(and(...conditions));

    return rows.map(toTenantApiKey);
  }

  async findById(
    tenantId: string,
    apiKeyId: string,
  ): Promise<TenantApiKey | undefined> {
    const rows = await this.db
      .select()
      .from(tenantApiKeys)
      .where(
        and(
          eq(tenantApiKeys.iq_tenant_id, tenantId),
          eq(tenantApiKeys.api_key_id, apiKeyId),
        ),
      )
      .limit(1);

    const row = rows[0];
    return row ? toTenantApiKey(row) : undefined;
  }

  async findByPrefix(
    prefix: string,
  ): Promise<(TenantApiKey & { key_hash: string }) | undefined> {
    const rows = await this.db
      .select()
      .from(tenantApiKeys)
      .where(eq(tenantApiKeys.key_prefix, prefix))
      .limit(1);

    const row = rows[0];
    if (!row) return undefined;
    return { ...toTenantApiKey(row), key_hash: row.key_hash };
  }

  async create(data: CreateTenantApiKeyData): Promise<TenantApiKey> {
    const rows = await this.db
      .insert(tenantApiKeys)
      .values({
        iq_tenant_id: data.iq_tenant_id,
        key_prefix: data.key_prefix,
        key_hash: data.key_hash,
        label: data.label ?? null,
        purpose: data.purpose ?? "opd_slip",
        environment: data.environment,
        expires_at: data.expires_at ? new Date(data.expires_at) : null,
        created_by: data.created_by ?? null,
        updated_by: data.created_by ?? null,
      })
      .returning();

    const row = rows[0];
    if (!row) {
      throw new Error("tenant api key insert returned no row");
    }
    return toTenantApiKey(row);
  }

  async updateStatus(
    tenantId: string,
    apiKeyId: string,
    data: UpdateTenantApiKeyStatusData,
  ): Promise<TenantApiKey | undefined> {
    const rows = await this.db
      .update(tenantApiKeys)
      .set(
        omitUndefined({
          status: data.status,
          updated_by: data.updated_by ?? null,
          updated_at: new Date(),
        }),
      )
      .where(
        and(
          eq(tenantApiKeys.iq_tenant_id, tenantId),
          eq(tenantApiKeys.api_key_id, apiKeyId),
        ),
      )
      .returning();

    const row = rows[0];
    return row ? toTenantApiKey(row) : undefined;
  }

  async touchLastUsed(apiKeyId: string): Promise<void> {
    await this.db
      .update(tenantApiKeys)
      .set({ last_used_at: new Date(), updated_at: new Date() })
      .where(eq(tenantApiKeys.api_key_id, apiKeyId));
  }
}
