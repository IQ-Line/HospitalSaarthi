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
const BRANCH_CODE_PATTERN = /^[A-Z0-9_-]{2,10}$/;

function normalizeBranchCode(value: string | null | undefined): string | null {
  const trimmed = value?.trim();
  if (!trimmed) return null;
  const normalized = trimmed.replace(/[‐-―−]/g, "-").toUpperCase();
  if (!BRANCH_CODE_PATTERN.test(normalized)) {
    throw new ConfiguratorError(
      400,
      "branch_code must be 2–10 characters (uppercase letters, digits, hyphen, underscore)",
    );
  }
  return normalized;
}

/**
 * Validates the required core fields and tenant type, returning the trimmed values.
 * Throws on missing required fields or an unknown tenant type.
 */
function validateCoreFields(data: CreateTenantData): {
  name: string;
  slug: string;
  cerbos_scope_key: string;
} {
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
  return { name, slug, cerbos_scope_key };
}

/**
 * Validates a branch (child) tenant: parent existence/ownership, branch_type, and
 * branch_code uniqueness within the organization. Only invoked when parent_tenant_id is set.
 */
async function validateBranchTenant(
  tenantRepo: TenantRepo,
  data: CreateTenantData,
  parentTenantId: string,
): Promise<void> {
  const parent = await tenantRepo.findById(parentTenantId);
  if (!parent || parent.org_id !== data.org_id) {
    throw new ConfiguratorError(400, "parent tenant not found for this organization");
  }
  const bc = normalizeBranchCode(data.branch_code);
  if (!data.branch_type || !BRANCH_TYPES.has(data.branch_type)) {
    throw new ConfiguratorError(400, "branch_type is required for branch tenants");
  }
  if (bc) {
    const dupBranch = await tenantRepo.findByOrgIdAndBranchCode(data.org_id, bc);
    if (dupBranch) {
      throw new ConfiguratorError(409, "branch_code already exists for this organization", "CONFLICT");
    }
  }
}

export async function createTenant(
  tenantRepo: TenantRepo,
  organizationRepo: OrganizationRepo,
  data: CreateTenantData,
): Promise<Tenant> {
  const { name, slug, cerbos_scope_key } = validateCoreFields(data);

  const org = await organizationRepo.findById(data.org_id);
  if (!org) {
    throw new ConfiguratorError(400, "organization not found");
  }

  if (data.parent_tenant_id) {
    await validateBranchTenant(tenantRepo, data, data.parent_tenant_id);
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
    branch_code: data.parent_tenant_id ? normalizeBranchCode(data.branch_code) : null,
    branch_type: data.parent_tenant_id ? (data.branch_type ?? null) : null,
  });
}
