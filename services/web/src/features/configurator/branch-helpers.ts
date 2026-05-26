// @keep-in-sync-with modules/configurator/src/domain/tenant-cerbos-scope.ts
export function buildTenantCerbosScopeKey(orgId: string, tenantSlug: string): string {
  return `tenant:${orgId}:${tenantSlug.trim().toLowerCase()}`;
}

export function branchTenantSlug(orgSlug: string, branchCode: string): string {
  const normalized = branchCode
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  const safeOrg = orgSlug
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return `${safeOrg}-${normalized.toLowerCase()}`;
}
