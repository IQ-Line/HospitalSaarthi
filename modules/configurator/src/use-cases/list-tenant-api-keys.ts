import type { TenantApiKeyRepo } from "../ports.js";
import type { TenantApiKey, TenantApiKeyFilters } from "../domain/tenant-api-key.types.js";

export async function listTenantApiKeys(
  repo: TenantApiKeyRepo,
  filters: TenantApiKeyFilters,
): Promise<TenantApiKey[]> {
  return repo.findAll(filters);
}
