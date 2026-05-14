import type { TenantModuleRepo } from "../ports.js";
import type { TenantModuleKey } from "../domain/tenant-module.types.js";

export async function deleteTenantModule(
  tenantModuleRepo: TenantModuleRepo,
  key: TenantModuleKey,
): Promise<boolean> {
  return tenantModuleRepo.delete(key);
}
