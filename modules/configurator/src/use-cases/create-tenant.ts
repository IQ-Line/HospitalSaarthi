import { ConfiguratorError } from "../errors.js";
import type { OrganizationRepo, TenantRepo } from "../ports.js";
import type { CreateTenantData, Tenant, TenantType } from "../domain/tenant.types.js";

const TENANT_TYPES = new Set<TenantType>(["full_platform", "fragmented", "lite"]);

export async function createTenant(
  tenantRepo: TenantRepo,
  organizationRepo: OrganizationRepo,
  data: CreateTenantData,
): Promise<Tenant> {
  const name = data.name?.trim() ?? "";
  const slug = data.slug?.trim() ?? "";
  const cerbos_scope_key = data.cerbos_scope_key?.trim() ?? "";
  if (!data.org_id || !name || !slug || !data.type || !cerbos_scope_key) {
    throw new ConfiguratorError(
      400,
      "org_id, name, slug, type, and cerbos_scope_key are required",
    );
  }
  if (!TENANT_TYPES.has(data.type)) {
    throw new ConfiguratorError(400, "invalid tenant type");
  }

  const org = await organizationRepo.findById(data.org_id);
  if (!org) {
    throw new ConfiguratorError(400, "organization not found");
  }

  const slugTaken = await tenantRepo.findBySlug(slug);
  if (slugTaken) {
    throw new ConfiguratorError(409, "tenant slug already exists", "CONFLICT");
  }

  return tenantRepo.create({
    ...data,
    name,
    slug,
    cerbos_scope_key,
    provisioning_status: data.provisioning_status ?? "provisioning",
  });
}
