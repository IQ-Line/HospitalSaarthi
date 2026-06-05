import type { DbInstance } from "@hims/ts-sdk-db";
import { and, eq, sql } from "drizzle-orm";
import type { Integration, IntegrationApiKey, IssuedApiKey } from "../domain/integration.types.js";
import type { IntegrationApiKeysRepository } from "../ports.js";
import { integrationApiKeys, integrations } from "../schema/tables.js";

function rowToApiKey(row: typeof integrationApiKeys.$inferSelect): IntegrationApiKey {
  return {
    id: row.id,
    iq_tenant_id: row.iq_tenant_id,
    integration_id: row.integration_id,
    key_prefix: row.key_prefix,
    label: row.label,
    status: row.status as IntegrationApiKey["status"],
    rate_limit_rpm: row.rate_limit_rpm,
    expires_at: row.expires_at?.toISOString() ?? null,
    last_used_at: row.last_used_at?.toISOString() ?? null,
    created_by: row.created_by,
    revoked_by: row.revoked_by,
    created_at: row.created_at.toISOString(),
    revoked_at: row.revoked_at?.toISOString() ?? null,
  };
}

export class DrizzleIntegrationApiKeysRepository implements IntegrationApiKeysRepository {
  constructor(private readonly db: DbInstance) {}

  async issue(
    tenantId: string,
    input: {
      integrationId: string;
      keyPrefix: string;
      keyHash: string;
      label: string;
      createdBy: string | null;
      rateLimitRpm?: number | null;
      expiresAt?: Date | null;
      plaintextKey: string;
    },
  ): Promise<IssuedApiKey> {
    const [row] = await this.db
      .insert(integrationApiKeys)
      .values({
        iq_tenant_id: tenantId,
        integration_id: input.integrationId,
        key_prefix: input.keyPrefix,
        key_hash: input.keyHash,
        label: input.label.trim(),
        status: "active",
        rate_limit_rpm: input.rateLimitRpm ?? null,
        expires_at: input.expiresAt ?? null,
        created_by: input.createdBy,
      })
      .returning();
    if (!row) throw new Error("api key insert failed");
    return {
      ...rowToApiKey(row),
      api_key: input.plaintextKey,
    };
  }

  async listByIntegration(tenantId: string, integrationId: string): Promise<IntegrationApiKey[]> {
    const rows = await this.db
      .select()
      .from(integrationApiKeys)
      .where(
        and(
          eq(integrationApiKeys.iq_tenant_id, tenantId),
          eq(integrationApiKeys.integration_id, integrationId),
        ),
      )
      .orderBy(sql`${integrationApiKeys.created_at} desc`);
    return rows.map(rowToApiKey);
  }

  async revoke(
    tenantId: string,
    integrationId: string,
    apiKeyId: string,
    revokedBy: string | null,
  ): Promise<IntegrationApiKey | null> {
    const [row] = await this.db
      .update(integrationApiKeys)
      .set({
        status: "revoked",
        revoked_by: revokedBy,
        revoked_at: new Date(),
      })
      .where(
        and(
          eq(integrationApiKeys.iq_tenant_id, tenantId),
          eq(integrationApiKeys.integration_id, integrationId),
          eq(integrationApiKeys.id, apiKeyId),
          eq(integrationApiKeys.status, "active"),
        ),
      )
      .returning();
    return row ? rowToApiKey(row) : null;
  }

  async revokeAllActiveForIntegration(
    tenantId: string,
    integrationId: string,
    revokedBy: string | null,
  ): Promise<number> {
    const rows = await this.db
      .update(integrationApiKeys)
      .set({
        status: "revoked",
        revoked_by: revokedBy,
        revoked_at: new Date(),
      })
      .where(
        and(
          eq(integrationApiKeys.iq_tenant_id, tenantId),
          eq(integrationApiKeys.integration_id, integrationId),
          eq(integrationApiKeys.status, "active"),
        ),
      )
      .returning({ id: integrationApiKeys.id });
    return rows.length;
  }

  async countActiveByIntegration(tenantId: string, integrationId: string): Promise<number> {
    const [row] = await this.db
      .select({ count: sql<number>`count(*)::int` })
      .from(integrationApiKeys)
      .where(
        and(
          eq(integrationApiKeys.iq_tenant_id, tenantId),
          eq(integrationApiKeys.integration_id, integrationId),
          eq(integrationApiKeys.status, "active"),
        ),
      );
    return row?.count ?? 0;
  }

  async findByPrefix(keyPrefix: string): Promise<
    | (IntegrationApiKey & {
        key_hash: string;
        integration_status: Integration["status"];
      })
    | null
  > {
    const [row] = await this.db
      .select({
        key: integrationApiKeys,
        integration_status: integrations.status,
      })
      .from(integrationApiKeys)
      .innerJoin(
        integrations,
        and(
          eq(integrations.iq_tenant_id, integrationApiKeys.iq_tenant_id),
          eq(integrations.id, integrationApiKeys.integration_id),
        ),
      )
      .where(eq(integrationApiKeys.key_prefix, keyPrefix))
      .limit(2);

    if (!row) return null;
    return {
      ...rowToApiKey(row.key),
      key_hash: row.key.key_hash,
      integration_status: row.integration_status as Integration["status"],
    };
  }
}
