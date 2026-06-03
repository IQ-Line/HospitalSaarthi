/** Normalized role codes for UX gates (JWT `roles` / permissions store). */
export function normalizeRoleCode(role: string): string {
  return role.trim().toLowerCase();
}

export function mergePrincipalRoleCodes(
  ...roleLists: ReadonlyArray<readonly string[] | undefined>
): readonly string[] {
  const merged = new Set<string>();
  for (const list of roleLists) {
    if (!list) {
      continue;
    }
    for (const role of list) {
      const normalized = normalizeRoleCode(role);
      if (normalized) {
        merged.add(normalized);
      }
    }
  }
  return [...merged];
}

/** True when the principal holds any listed role (case-insensitive). */
export function principalHasAnyRole(
  principalRoles: readonly string[],
  requiredRolesAny: readonly string[],
): boolean {
  if (requiredRolesAny.length === 0) {
    return true;
  }
  if (principalRoles.length === 0) {
    return false;
  }
  const held = new Set(principalRoles.map(normalizeRoleCode));
  return requiredRolesAny.some((role) => held.has(normalizeRoleCode(role)));
}
