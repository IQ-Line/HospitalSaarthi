import { ConfiguratorError } from "../errors.js";
import type { TenantIntegrationProfilesRepo } from "../ports.js";

export async function deleteTenantIntegrationProfile(
  repo: TenantIntegrationProfilesRepo,
  id: string,
  iqTenantId: string,
): Promise<void> {
  const existing = await repo.findById(id);
  if (!existing || existing.iq_tenant_id !== iqTenantId) {
    throw new ConfiguratorError(404, "integration profile not found");
  }

  const deleted = await repo.delete(id, iqTenantId);
  if (!deleted) {
    throw new ConfiguratorError(404, "integration profile not found");
  }
}
