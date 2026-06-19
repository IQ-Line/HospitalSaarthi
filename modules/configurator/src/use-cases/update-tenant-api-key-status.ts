import { ConfiguratorError } from "../errors.js";
import type { TenantApiKeyRepo } from "../ports.js";
import type {
  TenantApiKey,
  TenantApiKeyStatus,
} from "../domain/tenant-api-key.types.js";

export async function updateTenantApiKeyStatus(
  repo: TenantApiKeyRepo,
  tenantId: string,
  apiKeyId: string,
  status: TenantApiKeyStatus,
  actorId?: string | null,
): Promise<TenantApiKey> {
  if (status !== "active" && status !== "disabled" && status !== "revoked") {
    throw new ConfiguratorError(400, "invalid api key status");
  }

  const updated = await repo.updateStatus(tenantId, apiKeyId, {
    status,
    updated_by: actorId ?? null,
  });
  if (!updated) {
    throw new ConfiguratorError(404, "api key not found");
  }
  return updated;
}
