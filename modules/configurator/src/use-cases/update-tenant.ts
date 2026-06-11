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

  if (data.type !== undefined && !TENANT_TYPES.has(data.type)) {
    throw new ConfiguratorError(400, "invalid tenant type");
  }

  if (data.org_id !== undefined && data.org_id !== existing.org_id) {
    const org = await organizationRepo.findById(data.org_id);
    if (!org) {
      throw new ConfiguratorError(400, "organization not found");
    }
  }

  if (data.slug !== undefined) {
    const slug = data.slug.trim();
    if (!slug) {
      throw new ConfiguratorError(400, "slug cannot be empty");
    }
    const slugOwner = await tenantRepo.findBySlug(slug);
    if (slugOwner && slugOwner.iq_tenant_id !== id) {
      throw new ConfiguratorError(409, "tenant slug already exists", "CONFLICT");
    }
    data = { ...data, slug };
  }

  if (data.provisioning_status !== undefined) {
    const from = existing.provisioning_status;
    const to = data.provisioning_status;
    if (!isAllowedProvisioningTransition(from, to)) {
      throw new ConfiguratorError(400, "invalid provisioning_status transition");
    }
  }

  if (data.free_follow_up_days !== undefined) {
    const days = Number(data.free_follow_up_days);
    if (!Number.isFinite(days) || days < 0) {
      throw new ConfiguratorError(400, "free_follow_up_days must be a non-negative number");
    }
    data = { ...data, free_follow_up_days: Math.trunc(days) };
  }

  if (data.free_follow_up_visits !== undefined) {
    const visits = Number(data.free_follow_up_visits);
    if (!Number.isFinite(visits) || visits < 0) {
      throw new ConfiguratorError(400, "free_follow_up_visits must be a non-negative number");
    }
    data = { ...data, free_follow_up_visits: Math.trunc(visits) };
  }

  const updated = await tenantRepo.update(id, data);
  return updated ?? null;
}
