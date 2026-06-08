import type { DbInstance } from "@hims/ts-sdk-db";
import { and, eq, isNull } from "drizzle-orm";
import type { ApiKeyStatus, IntegrationApiKey } from "../domain/integration.types.js";
import type { IntegrationApiKeyRepository } from "../ports.js";
import { integrationApiKeys } from "../schema/tables.js";

function rowToApiKey(row: {
  api_key_id: string;
  integration_id: string;
  key_prefix: string;
  status: string;
  expires_at: Date | null;
  last_used_at: Date | null;
  created_at: Date;
  revoked_at: Date | null;
  created_by: string | null;
}): IntegrationApiKey {
  return {
    api_key_id: row.api_key_id,
    integration_id: row.integration_id,
    key_prefix: row.key_prefix,
    status: row.status as ApiKeyStatus,
    expires_at: row.expires_at?.toISOString() ?? null,
    last_used_at: row.last_used_at?.toISOString() ?? null,
    created_at: row.created_at.toISOString(),
    revoked_at: row.revoked_at?.toISOString() ?? null,
    created_by: row.created_by,
  };
}

export class DrizzleIntegrationApiKeyRepository implements IntegrationApiKeyRepository {
  constructor(private readonly db: DbInstance) {}

  async listByIntegration(
    tenantId: string,
    integrationId: string,
  ): Promise<IntegrationApiKey[]> {
    const rows = await this.db
      .select()
      .from(integrationApiKeys)
      .where(
        and(
          eq(integrationApiKeys.iq_tenant_id, tenantId),
          eq(integrationApiKeys.integration_id, integrationId),
        ),
      );
    return rows.map(rowToApiKey);
  }

  async issue(
    tenantId: string,
    integrationId: string,
    input: {
      key_prefix: string;
      key_hash: string;
      expires_at: string | null;
      actorId: string;
    },
  ) {
    const [row] = await this.db
      .insert(integrationApiKeys)
      .values({
        iq_tenant_id: tenantId,
        integration_id: integrationId,
        key_prefix: input.key_prefix,
        key_hash: input.key_hash,
        status: "active",
        expires_at: input.expires_at ? new Date(input.expires_at) : null,
        created_by: input.actorId,
      })
      .returning();

    if (!row) {
      throw new Error("Failed to issue API key");
    }

    return {
      ...rowToApiKey(row),
      plaintext_secret: "",
    };
  }

  async revoke(
    tenantId: string,
    integrationId: string,
    apiKeyId: string,
    _actorId: string,
  ): Promise<IntegrationApiKey | null> {
    const [row] = await this.db
      .update(integrationApiKeys)
      .set({
        status: "revoked",
        revoked_at: new Date(),
      })
      .where(
        and(
          eq(integrationApiKeys.iq_tenant_id, tenantId),
          eq(integrationApiKeys.integration_id, integrationId),
          eq(integrationApiKeys.api_key_id, apiKeyId),
          eq(integrationApiKeys.status, "active"),
        ),
      )
      .returning();
    return row ? rowToApiKey(row) : null;
  }

  async revokeAllActiveForIntegration(
    tenantId: string,
    integrationId: string,
    _actorId: string,
  ): Promise<number> {
    const result = await this.db
      .update(integrationApiKeys)
      .set({
        status: "revoked",
        revoked_at: new Date(),
      })
      .where(
        and(
          eq(integrationApiKeys.iq_tenant_id, tenantId),
          eq(integrationApiKeys.integration_id, integrationId),
          eq(integrationApiKeys.status, "active"),
          isNull(integrationApiKeys.revoked_at),
        ),
      );
    return result.rowCount ?? 0;
  }
}
