import { ConfiguratorError } from "../errors.js";
import type { TenantIntegrationProfilesRepo } from "../ports.js";
import type { TenantIntegrationProfile } from "../domain/tenant-integration-profile.types.js";

export async function getTenantIntegrationProfileById(
  repo: TenantIntegrationProfilesRepo,
  id: string,
  iqTenantId?: string,
): Promise<TenantIntegrationProfile> {
  const row = await repo.findById(id);
  if (!row) {
    throw new ConfiguratorError(404, "integration profile not found");
  }
  if (iqTenantId && row.iq_tenant_id !== iqTenantId) {
    throw new ConfiguratorError(404, "integration profile not found");
  }
  return row;
}
