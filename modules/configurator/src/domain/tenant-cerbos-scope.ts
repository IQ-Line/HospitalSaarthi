// @keep-in-sync-with services/web/src/features/configurator/branch-helpers.ts

/**
 * Builds a globally unique Cerbos scope key per tenant row.
 * Must not reuse organisation id alone — idx_tenants_cerbos_scope is unique.
 */
export function buildTenantCerbosScopeKey(orgId: string, tenantSlug: string): string {
  const slug = tenantSlug.trim().toLowerCase();
  return `tenant:${orgId}:${slug}`;
}
