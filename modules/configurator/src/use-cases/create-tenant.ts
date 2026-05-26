import { ConfiguratorError } from "../errors.js";
import type { OrganizationRepo, TenantRepo } from "../ports.js";
import type {
  BranchType,
  CreateTenantData,
  Tenant,
  TenantType,
} from "../domain/tenant.types.js";

const TENANT_TYPES = new Set<TenantType>(["full_platform", "fragmented", "lite"]);
const BRANCH_TYPES = new Set<BranchType>(["hub_lab", "hub", "satellite"]);

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

  if (data.parent_tenant_id) {
    const parent = await tenantRepo.findById(data.parent_tenant_id);
    if (!parent || parent.org_id !== data.org_id) {
      throw new ConfiguratorError(400, "parent tenant not found for this organization");
    }
    const bc = (data.branch_code ?? "").trim().toUpperCase();
    if (!/^[A-Z0-9-]{2,10}$/.test(bc)) {
      throw new ConfiguratorError(
        400,
        "branch_code must be 2–10 characters (uppercase letters, digits, hyphen)",
      );
    }
    if (!data.branch_type || !BRANCH_TYPES.has(data.branch_type)) {
      throw new ConfiguratorError(400, "branch_type is required for branch tenants");
    }
    const dupBranch = await tenantRepo.findByOrgIdAndBranchCode(data.org_id, bc);
    if (dupBranch) {
      throw new ConfiguratorError(409, "branch_code already exists for this organization", "CONFLICT");
    }
  }

  const slugTaken = await tenantRepo.findBySlug(slug);
  if (slugTaken) {
    throw new ConfiguratorError(409, "tenant slug already exists", "CONFLICT");
  }

  if (data.provisioning_status && data.provisioning_status !== "provisioning") {
    throw new ConfiguratorError(
      400,
      "new tenants must start in provisioning status",
    );
  }

  return tenantRepo.create({
    ...data,
    name,
    slug,
    cerbos_scope_key,
    provisioning_status: "provisioning",
    branch_code: data.parent_tenant_id
      ? (data.branch_code ?? "").trim().toUpperCase()
      : null,
    branch_type: data.parent_tenant_id ? (data.branch_type ?? null) : null,
  });
}
