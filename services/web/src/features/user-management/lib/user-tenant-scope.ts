/** Query-cache segment for UM calls scoped to a hospital tenant (`iq_tenant_id`). */
export function userTenantScopeKey(tenantScope?: string | null): string {
  const trimmed = tenantScope?.trim();
  return trimmed && trimmed.length > 0 ? trimmed : 'active-tenant';
}

export function userTenantApiContext(tenantScope?: string | null) {
  const trimmed = tenantScope?.trim();
  return trimmed && trimmed.length > 0 ? { tenantIdOverride: trimmed } : undefined;
}

/**
 * Tenant scope for User Management list pages (users + roles).
 * Platform super-admins always use their home (platform) tenant — not the header
 * tenant switcher nor a cross-tenant directory aggregate.
 */
export function resolveUserManagementListTenantScope(input: {
  isPlatformSuperAdmin: boolean;
  homeTenantId: string | null | undefined;
  activeTenantId: string | null | undefined;
}): string | null {
  const home = input.homeTenantId?.trim() || null;
  const active = input.activeTenantId?.trim() || null;
  if (input.isPlatformSuperAdmin) {
    return home;
  }
  return active ?? home;
}
