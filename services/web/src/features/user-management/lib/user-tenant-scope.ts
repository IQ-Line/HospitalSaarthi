/** Query-cache segment for UM calls scoped to a hospital tenant (`iq_tenant_id`). */
export function userTenantScopeKey(tenantScope?: string | null): string {
  const trimmed = tenantScope?.trim();
  return trimmed && trimmed.length > 0 ? trimmed : 'active-tenant';
}

export function userTenantApiContext(tenantScope?: string | null) {
  const trimmed = tenantScope?.trim();
  return trimmed && trimmed.length > 0 ? { tenantIdOverride: trimmed } : undefined;
}
