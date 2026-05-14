import type { TenantModuleRepo } from "../ports.js";
import type { TenantModule, TenantModuleKey } from "../domain/tenant-module.types.js";

export async function getTenantModuleByKey(
  repo: TenantModuleRepo,
  key: TenantModuleKey,
): Promise<TenantModule | undefined> {
  return repo.findByKey(key);
}
