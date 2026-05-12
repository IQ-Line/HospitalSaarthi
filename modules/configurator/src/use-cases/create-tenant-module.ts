import { ConfiguratorError } from "../errors.js";
import type { TenantModuleRepo, TenantRepo } from "../ports.js";
import type {
  CreateTenantModuleData,
  TenantModule,
} from "../domain/tenant-module.types.js";

export async function createTenantModule(
  tenantModuleRepo: TenantModuleRepo,
  tenantRepo: TenantRepo,
  data: CreateTenantModuleData,
): Promise<TenantModule> {
  if (!data.iq_tenant_id || !data.module_id) {
    throw new ConfiguratorError(400, "iq_tenant_id and module_id are required");
  }

  const tenant = await tenantRepo.findById(data.iq_tenant_id);
  if (!tenant) {
    throw new ConfiguratorError(400, "tenant not found");
  }

  const existing = await tenantModuleRepo.findByKey({
    iq_tenant_id: data.iq_tenant_id,
    module_id: data.module_id,
  });
  if (existing) {
    throw new ConfiguratorError(
      409,
      "tenant module enablement already exists",
      "CONFLICT",
    );
  }

  const isActive = data.is_active ?? true;
  const isCoreOverride = data.is_core_override ?? false;
  if (isCoreOverride && !isActive) {
    throw new ConfiguratorError(400, "core modules cannot be deactivated");
  }

  return tenantModuleRepo.create({
    ...data,
    is_active: isActive,
    is_core_override: isCoreOverride,
  });
}
