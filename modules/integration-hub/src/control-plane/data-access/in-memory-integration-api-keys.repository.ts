import { randomUUID } from "node:crypto";
import type { Integration, IntegrationApiKey, IssuedApiKey } from "../domain/integration.types.js";
import type { IntegrationApiKeysRepository } from "../ports.js";
import type { InMemoryIntegrationsRepository } from "./in-memory-integrations.repository.js";

export class InMemoryIntegrationApiKeysRepository implements IntegrationApiKeysRepository {
  private readonly rows = new Map<string, IntegrationApiKey & { key_hash: string }>();

  constructor(private readonly integrations?: InMemoryIntegrationsRepository) {}

  private key(tenantId: string, apiKeyId: string): string {
    return `${tenantId}:${apiKeyId}`;
  }

  async issue(
    tenantId: string,
    input: {
      integrationId: string;
      keyPrefix: string;
      keyHash: string;
      label: string;
      plaintextKey: string;
      createdBy: string | null;
      rateLimitRpm?: number | null;
      expiresAt?: Date | null;
    },
  ): Promise<IssuedApiKey> {
    const now = new Date().toISOString();
    const row: IntegrationApiKey & { key_hash: string } = {
      id: randomUUID(),
      iq_tenant_id: tenantId,
      integration_id: input.integrationId,
      key_prefix: input.keyPrefix,
      key_hash: input.keyHash,
      label: input.label.trim(),
      status: "active",
      rate_limit_rpm: input.rateLimitRpm ?? null,
      expires_at: input.expiresAt?.toISOString() ?? null,
      last_used_at: null,
      created_by: input.createdBy,
      revoked_by: null,
      created_at: now,
      revoked_at: null,
    };
    this.rows.set(this.key(tenantId, row.id), row);
    return { ...row, api_key: input.plaintextKey };
  }

  async listByIntegration(tenantId: string, integrationId: string): Promise<IntegrationApiKey[]> {
    return [...this.rows.values()]
      .filter((row) => row.iq_tenant_id === tenantId && row.integration_id === integrationId)
      .map(({ key_hash: _keyHash, ...apiKey }) => apiKey);
  }

  async revoke(
    tenantId: string,
    integrationId: string,
    apiKeyId: string,
    revokedBy: string | null,
  ): Promise<IntegrationApiKey | null> {
    const row = this.rows.get(this.key(tenantId, apiKeyId));
    if (!row || row.integration_id !== integrationId || row.status !== "active") return null;
    const revoked: IntegrationApiKey & { key_hash: string } = {
      ...row,
      status: "revoked",
      revoked_by: revokedBy,
      revoked_at: new Date().toISOString(),
    };
    this.rows.set(this.key(tenantId, apiKeyId), revoked);
    const { key_hash: _keyHash, ...apiKey } = revoked;
    return apiKey;
  }

  async revokeAllActiveForIntegration(
    tenantId: string,
    integrationId: string,
    revokedBy: string | null,
  ): Promise<number> {
    let count = 0;
    for (const [mapKey, row] of this.rows.entries()) {
      if (
        row.iq_tenant_id === tenantId &&
        row.integration_id === integrationId &&
        row.status === "active"
      ) {
        this.rows.set(mapKey, {
          ...row,
          status: "revoked",
          revoked_by: revokedBy,
          revoked_at: new Date().toISOString(),
        });
        count += 1;
      }
    }
    return count;
  }

  async countActiveByIntegration(tenantId: string, integrationId: string): Promise<number> {
    return [...this.rows.values()].filter(
      (row) =>
        row.iq_tenant_id === tenantId &&
        row.integration_id === integrationId &&
        row.status === "active",
    ).length;
  }

  async findByPrefix(keyPrefix: string): Promise<
    | (IntegrationApiKey & {
        key_hash: string;
        integration_status: Integration["status"];
      })
    | null
  > {
    const matches = [...this.rows.values()].filter((row) => row.key_prefix === keyPrefix);
    if (matches.length !== 1) return null;
    const row = matches[0]!;
    const integration = this.integrations
      ? await this.integrations.getById(row.iq_tenant_id, row.integration_id)
      : null;
    const { key_hash: _keyHash, ...apiKey } = row;
    return {
      ...apiKey,
      key_hash: row.key_hash,
      integration_status: integration?.status ?? "draft",
    };
  }

}
