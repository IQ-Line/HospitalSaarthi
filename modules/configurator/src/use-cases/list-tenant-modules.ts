import type { TenantModuleRepo } from "../ports.js";
import type { TenantModule, TenantModuleFilters } from "../domain/tenant-module.types.js";

export async function listTenantModules(
  repo: TenantModuleRepo,
  filters: TenantModuleFilters,
): Promise<TenantModule[]> {
  return repo.findAll(filters);
}
