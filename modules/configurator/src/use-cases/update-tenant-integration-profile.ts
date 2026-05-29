import { ConfiguratorError } from "../errors.js";
import type { TenantIntegrationProfilesRepo } from "../ports.js";
import type {
  TenantIntegrationProfile,
  UpdateTenantIntegrationProfileData,
} from "../domain/tenant-integration-profile.types.js";

export async function updateTenantIntegrationProfile(
  repo: TenantIntegrationProfilesRepo,
  id: string,
  iqTenantId: string,
  data: UpdateTenantIntegrationProfileData,
): Promise<TenantIntegrationProfile> {
  const existing = await repo.findById(id);
  if (!existing || existing.iq_tenant_id !== iqTenantId) {
    throw new ConfiguratorError(404, "integration profile not found");
  }

  const updated = await repo.update(id, data);
  if (!updated) {
    throw new ConfiguratorError(404, "integration profile not found");
  }
  return updated;
}
