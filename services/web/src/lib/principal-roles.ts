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

/** Human-readable label for a Cerbos/JWT role code (e.g. `receptionist` → `Receptionist`). */
export function formatRoleCodeLabel(roleCode: string): string {
  const trimmed = roleCode.trim();
  if (!trimmed) {
    return '';
  }
  return trimmed
    .replace(/[-_]+/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

/** Merged principal roles as a comma-separated display string for shell UX. */
export function formatPrincipalRoleLabels(
  ...roleLists: ReadonlyArray<readonly string[] | undefined>
): string {
  return mergePrincipalRoleCodes(...roleLists)
    .map(formatRoleCodeLabel)
    .filter((label) => label.length > 0)
    .join(', ');
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
