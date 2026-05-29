import { ConfiguratorError } from "../errors.js";
import type { TenantIntegrationProfilesRepo } from "../ports.js";
import type {
  IntegrationKind,
  TenantIntegrationProfile,
} from "../domain/tenant-integration-profile.types.js";

export async function getActiveIntegrationProfileByHipId(
  repo: TenantIntegrationProfilesRepo,
  hipId: string,
  integrationKind: IntegrationKind = "abdm",
): Promise<TenantIntegrationProfile> {
  const row = await repo.findActiveByHipId(hipId, integrationKind);
  if (!row) {
    throw new ConfiguratorError(404, "no active integration profile for hip_id");
  }
  return row;
}
