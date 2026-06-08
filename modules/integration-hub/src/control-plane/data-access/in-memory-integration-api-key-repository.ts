import { randomUUID } from "node:crypto";
import type { IntegrationApiKey } from "../domain/integration.types.js";
import type { IntegrationApiKeyRepository } from "../ports.js";

export class InMemoryIntegrationApiKeyRepository implements IntegrationApiKeyRepository {
  private readonly rows = new Map<string, IntegrationApiKey & { key_hash: string }>();

  private key(tenantId: string, apiKeyId: string): string {
    return `${tenantId}:${apiKeyId}`;
  }

  async listByIntegration(
    tenantId: string,
    integrationId: string,
  ): Promise<IntegrationApiKey[]> {
    return [...this.rows.values()]
      .filter((row) => row.integration_id === integrationId)
      .map(({ key_hash: _hash, ...rest }) => rest);
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
    const apiKeyId = randomUUID();
    const now = new Date().toISOString();
    const row = {
      api_key_id: apiKeyId,
      integration_id: integrationId,
      key_prefix: input.key_prefix,
      key_hash: input.key_hash,
      status: "active" as const,
      expires_at: input.expires_at,
      last_used_at: null,
      created_at: now,
      revoked_at: null,
      created_by: input.actorId,
    };
    this.rows.set(this.key(tenantId, apiKeyId), row);
    return {
      ...row,
      plaintext_secret: "",
    };
  }

  async revoke(
    tenantId: string,
    integrationId: string,
    apiKeyId: string,
    _actorId: string,
  ): Promise<IntegrationApiKey | null> {
    const existing = this.rows.get(this.key(tenantId, apiKeyId));
    if (
      existing === undefined ||
      existing.integration_id !== integrationId ||
      existing.status !== "active"
    ) {
      return null;
    }
    const updated = {
      ...existing,
      status: "revoked" as const,
      revoked_at: new Date().toISOString(),
    };
    this.rows.set(this.key(tenantId, apiKeyId), updated);
    const { key_hash: _hash, ...rest } = updated;
    return rest;
  }

  async revokeAllActiveForIntegration(
    tenantId: string,
    integrationId: string,
    _actorId: string,
  ): Promise<number> {
    let count = 0;
    for (const [mapKey, row] of this.rows.entries()) {
      if (row.integration_id === integrationId && row.status === "active") {
        this.rows.set(mapKey, {
          ...row,
          status: "revoked",
          revoked_at: new Date().toISOString(),
        });
        count += 1;
      }
    }
    return count;
  }
}
