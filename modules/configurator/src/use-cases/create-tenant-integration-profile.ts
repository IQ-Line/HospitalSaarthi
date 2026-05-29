import { ConfiguratorError } from "../errors.js";
import type { TenantIntegrationProfilesRepo, TenantRepo } from "../ports.js";
import type {
  CreateTenantIntegrationProfileData,
  TenantIntegrationProfile,
} from "../domain/tenant-integration-profile.types.js";

export async function createTenantIntegrationProfile(
  repo: TenantIntegrationProfilesRepo,
  tenantRepo: TenantRepo,
  data: CreateTenantIntegrationProfileData,
): Promise<TenantIntegrationProfile> {
  if (!data.iq_tenant_id || !data.hip_id || !data.hiu_id) {
    throw new ConfiguratorError(400, "iq_tenant_id, hip_id, and hiu_id are required");
  }

  const tenant = await tenantRepo.findById(data.iq_tenant_id);
  if (!tenant) {
    throw new ConfiguratorError(400, "tenant not found");
  }

  // Uniqueness on (iq_tenant_id, integration_kind) is enforced by DB; router maps 23505 → 409.
  return repo.create(data);
}
