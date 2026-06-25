import type { TenantIntegrationProfilesRepo } from "../ports.js";
import type {
  IntegrationKind,
  TenantIntegrationProfile,
} from "../domain/tenant-integration-profile.types.js";

export async function listActiveAbdmIntegrationProfiles(
  repo: TenantIntegrationProfilesRepo,
  integrationKind: IntegrationKind = "abdm",
): Promise<TenantIntegrationProfile[]> {
  return repo.findAllActiveByKind(integrationKind);
}
