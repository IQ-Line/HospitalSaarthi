import type { ConfiguratorTenant, Organization } from '@/features/configurator/types';

export function organisationWebsiteFromOrg(org: Organization): string {
  if (org.website?.trim()) return org.website.trim();
  const meta = org.metadata as { website?: string | null } | null | undefined;
  return meta?.website?.trim() ?? '';
}

export function organisationEmailFromOrg(org: Organization): string {
  return org.contact_email?.trim() ?? '';
}

/** Organisation ids that already have at least one configurator tenant row. */
export function orgIdsWithTenants(
  tenants: ReadonlyArray<Pick<ConfiguratorTenant, 'org_id'>>,
): Set<string> {
  const ids = new Set<string>();
  for (const tenant of tenants) {
    const orgId = tenant.org_id?.trim();
    if (orgId) ids.add(orgId);
  }
  return ids;
}

/**
 * Standalone hospitals support a single tenant per organisation; exclude them from
 * the create-tenant wizard when a tenant already exists.
 */
export function organisationEligibleForNewTenant(
  org: Organization,
  tenantOrgIds: ReadonlySet<string>,
): boolean {
  if (org.type !== 'standalone_hospital') return true;
  return !tenantOrgIds.has(org.id);
}

export function filterOrganisationsForTenantWizard(
  organisations: Organization[],
  tenantOrgIds: ReadonlySet<string>,
): Organization[] {
  return organisations.filter((org) => organisationEligibleForNewTenant(org, tenantOrgIds));
}
