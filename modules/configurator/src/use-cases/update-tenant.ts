import { ConfiguratorError } from "../errors.js";
import type { OrganizationRepo, TenantRepo } from "../ports.js";
import type {
  ProvisioningStatus,
  Tenant,
  TenantType,
  UpdateTenantData,
} from "../domain/tenant.types.js";

const TENANT_TYPES = new Set<TenantType>(["full_platform", "fragmented", "lite"]);

const ALLOWED_PROVISIONING_TRANSITIONS = new Set<string>([
  "provisioning:active",
  "active:suspended",
  "suspended:active",
  "active:decommissioned",
  "suspended:decommissioned",
]);

function isAllowedProvisioningTransition(
  from: ProvisioningStatus,
  to: ProvisioningStatus,
): boolean {
  if (from === to) {
    return true;
  }
  return ALLOWED_PROVISIONING_TRANSITIONS.has(`${from}:${to}`);
}

function assertValidType(data: UpdateTenantData): void {
  if (data.type !== undefined && !TENANT_TYPES.has(data.type)) {
    throw new ConfiguratorError(400, "invalid tenant type");
  }
}

async function assertOrganizationExists(
  organizationRepo: OrganizationRepo,
  data: UpdateTenantData,
  existing: Tenant,
): Promise<void> {
  if (data.org_id === undefined || data.org_id === existing.org_id) {
    return;
  }
  const org = await organizationRepo.findById(data.org_id);
  if (!org) {
    throw new ConfiguratorError(400, "organization not found");
  }
}

function assertValidProvisioningTransition(
  data: UpdateTenantData,
  existing: Tenant,
): void {
  if (data.provisioning_status === undefined) {
    return;
  }
  if (!isAllowedProvisioningTransition(existing.provisioning_status, data.provisioning_status)) {
    throw new ConfiguratorError(400, "invalid provisioning_status transition");
  }
}

async function normalizeSlug(
  tenantRepo: TenantRepo,
  data: UpdateTenantData,
  id: string,
): Promise<UpdateTenantData> {
  if (data.slug === undefined) {
    return data;
  }
  const slug = data.slug.trim();
  if (!slug) {
    throw new ConfiguratorError(400, "slug cannot be empty");
  }
  const slugOwner = await tenantRepo.findBySlug(slug);
  if (slugOwner && slugOwner.iq_tenant_id !== id) {
    throw new ConfiguratorError(409, "tenant slug already exists", "CONFLICT");
  }
  return { ...data, slug };
}

function normalizeNonNegativeInt(
  value: number,
  fieldName: "free_follow_up_days" | "free_follow_up_visits",
): number {
  const n = Number(value);
  if (!Number.isFinite(n) || n < 0) {
    throw new ConfiguratorError(400, `${fieldName} must be a non-negative number`);
  }
  return Math.trunc(n);
}

function normalizeFreeFollowUps(data: UpdateTenantData): UpdateTenantData {
  let next = data;
  if (next.free_follow_up_days !== undefined) {
    next = {
      ...next,
      free_follow_up_days: normalizeNonNegativeInt(next.free_follow_up_days, "free_follow_up_days"),
    };
  }
  if (next.free_follow_up_visits !== undefined) {
    next = {
      ...next,
      free_follow_up_visits: normalizeNonNegativeInt(
        next.free_follow_up_visits,
        "free_follow_up_visits",
      ),
    };
  }
  return next;
}

export async function updateTenant(
  tenantRepo: TenantRepo,
  organizationRepo: OrganizationRepo,
  id: string,
  data: UpdateTenantData,
): Promise<Tenant | null> {
  const existing = await tenantRepo.findById(id);
  if (!existing) {
    return null;
  }

  assertValidType(data);
  await assertOrganizationExists(organizationRepo, data, existing);

  let patch = await normalizeSlug(tenantRepo, data, id);

  assertValidProvisioningTransition(patch, existing);

  patch = normalizeFreeFollowUps(patch);

  const updated = await tenantRepo.update(id, patch);
  return updated ?? null;
}
