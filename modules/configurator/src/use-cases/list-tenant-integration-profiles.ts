import type { TenantIntegrationProfilesRepo } from "../ports.js";
import type {
  TenantIntegrationProfile,
  TenantIntegrationProfileFilters,
} from "../domain/tenant-integration-profile.types.js";

export async function listTenantIntegrationProfiles(
  repo: TenantIntegrationProfilesRepo,
  filters: TenantIntegrationProfileFilters,
): Promise<TenantIntegrationProfile[]> {
  return repo.findAll(filters);
}
