/**
 * Canonical role type normalization — must match persisted shape
 * (`roles_role_type_canonical_chk`: `lower(btrim(role_type))`).
 */
export function normalizeRoleType(roleType: string): string {
  return roleType.trim().toLowerCase();
}
