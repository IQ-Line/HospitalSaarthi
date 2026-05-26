import type { OrganizationRepo, TenantModuleRepo, TenantRepo } from "../ports.js";
import type { CreateOrganizationData, Organization } from "../domain/organization.types.js";
import type { Tenant } from "../domain/tenant.types.js";
import type { TenantModule } from "../domain/tenant-module.types.js";
import { createOrganizationWithDefaultTenant } from "./create-organization-with-default-tenant.js";
import { createTenantModule } from "./create-tenant-module.js";

export interface TenantModuleEnablementInput {
  module_id: string;
  is_active: boolean;
}

export interface OrganizationProvisionWithModulesResult {
  organization: Organization;
  default_tenant: Tenant;
  tenant_modules: TenantModule[];
}

/**
 * @deprecated Use {@link createOrganization} plus {@link provisionTenant} (tenant-onboarding) instead.
 *
 * Legacy: organization + default tenant + tenant_modules in one transaction.
 */
export async function createOrganizationWithDefaultTenantAndTenantModules(
  organizationRepo: OrganizationRepo,
  tenantRepo: TenantRepo,
  tenantModuleRepo: TenantModuleRepo,
  orgData: CreateOrganizationData,
  tenantModuleRows: TenantModuleEnablementInput[],
  createdBy: string | null | undefined,
): Promise<OrganizationProvisionWithModulesResult> {
  const { organization, default_tenant } = await createOrganizationWithDefaultTenant(
    organizationRepo,
    tenantRepo,
    orgData,
  );

  const seen = new Set<string>();
  const tenant_modules: TenantModule[] = [];

  for (const row of tenantModuleRows) {
    const id = row.module_id?.trim();
    if (!id || seen.has(id)) continue;
    seen.add(id);
    tenant_modules.push(
      await createTenantModule(tenantModuleRepo, tenantRepo, {
        iq_tenant_id: default_tenant.iq_tenant_id,
        module_id: id,
        is_active: row.is_active,
        is_core_override: false,
        created_by: createdBy ?? null,
      }),
    );
  }

  return { organization, default_tenant, tenant_modules };
}
