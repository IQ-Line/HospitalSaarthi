import type { TenantRepo } from "../ports.js";
import type { Tenant, TenantFilters } from "../domain/tenant.types.js";

export async function listTenants(
  repo: TenantRepo,
  filters?: TenantFilters,
): Promise<Tenant[]> {
  return repo.findAll(filters);
}
