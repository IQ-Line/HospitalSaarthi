/**
 * Platform superadmin working on a facility (active tenant ≠ home / platform tenant).
 * Inventory Masters + Store Configuration are tenant-scoped — only then should they unlock.
 */
export function isOperatingAsFacilityTenant(input: {
  isPlatformSuperAdmin: boolean;
  homeTenantId: string | null | undefined;
  activeTenantId: string | null | undefined;
}): boolean {
  if (!input.isPlatformSuperAdmin) {
    return false;
  }
  const home = input.homeTenantId?.trim() || null;
  const active = input.activeTenantId?.trim() || null;
  if (!home || !active) {
    return false;
  }
  return active !== home;
}
