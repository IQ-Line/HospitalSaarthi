import type { OrganizationRepo, TenantRepo } from "../ports.js";
import type { CreateOrganizationData, Organization } from "../domain/organization.types.js";
import type { Tenant } from "../domain/tenant.types.js";
import { createOrganization } from "./create-organization.js";
import { createTenant } from "./create-tenant.js";

export interface OrganizationWithDefaultTenantResult {
  organization: Organization;
  default_tenant: Tenant;
}

/**
 * Creates an organization and a root default tenant (same name/slug, full_platform,
 * provisioning, shared isolation). `cerbos_scope_key` is `tenant:{organization.id}` (globally unique).
 *
 * Call inside `runConfiguratorTransaction` so both inserts commit or roll back together.
 * For module enablement rows on the default tenant in the same transaction, use
 * `createOrganizationWithDefaultTenantAndTenantModules`.
 */
export async function createOrganizationWithDefaultTenant(
  organizationRepo: OrganizationRepo,
  tenantRepo: TenantRepo,
  data: CreateOrganizationData,
): Promise<OrganizationWithDefaultTenantResult> {
  const organization = await createOrganization(organizationRepo, data);

  const default_tenant = await createTenant(tenantRepo, organizationRepo, {
    org_id: organization.id,
    parent_tenant_id: null,
    name: organization.name,
    slug: organization.slug,
    type: "full_platform",
    provisioning_status: "provisioning",
    data_isolation_level: "shared",
    cerbos_scope_key: `tenant:${organization.id}`,
    timezone: "Asia/Kolkata",
    locale: "en-IN",
    metadata: organization.metadata,
    created_by: data.created_by ?? null,
  });

  return { organization, default_tenant };
}
