import { ConfiguratorError } from "../errors.js";
import type { TenantModuleRepo } from "../ports.js";
import type {
  TenantModule,
  TenantModuleKey,
  UpdateTenantModuleData,
} from "../domain/tenant-module.types.js";

export async function updateTenantModule(
  tenantModuleRepo: TenantModuleRepo,
  key: TenantModuleKey,
  data: UpdateTenantModuleData,
): Promise<TenantModule | null> {
  const existing = await tenantModuleRepo.findByKey(key);
  if (!existing) {
    return null;
  }

  const nextIsActive = data.is_active ?? existing.is_active;
  const nextIsCoreOverride = data.is_core_override ?? existing.is_core_override;
  if (nextIsCoreOverride && !nextIsActive) {
    throw new ConfiguratorError(400, "core modules cannot be deactivated");
  }

  const updated = await tenantModuleRepo.update(key, data);
  return updated ?? null;
}
