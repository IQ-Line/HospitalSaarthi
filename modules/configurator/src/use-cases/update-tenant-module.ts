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

  const nextIsEnabled = data.is_enabled ?? existing.is_enabled;
  const nextIsCoreOverride = data.is_core_override ?? existing.is_core_override;
  if (nextIsCoreOverride && !nextIsEnabled) {
    throw new ConfiguratorError(400, "core modules cannot be disabled");
  }

  const patch: UpdateTenantModuleData = { ...data };
  const now = new Date();

  if (data.is_enabled !== undefined && data.is_enabled !== existing.is_enabled) {
    if (data.is_enabled) {
      patch.enabled_at = now;
      patch.disabled_at = null;
    } else {
      patch.disabled_at = now;
    }
  }

  const updated = await tenantModuleRepo.update(key, patch);
  return updated ?? null;
}
