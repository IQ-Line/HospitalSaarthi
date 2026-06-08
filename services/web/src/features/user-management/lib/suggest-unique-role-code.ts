/** Slug for tenant-unique role `code` (distinct from picklist `role_type`). */
export function toRoleCodeSlug(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function normalizedCodeSet(existingCodes: readonly string[]): Set<string> {
  return new Set(existingCodes.map((c) => c.trim().toLowerCase()).filter((c) => c.length > 0));
}

/**
 * Suggest a tenant-unique role code from type + display name.
 * Platform types often use code === roleType; staff templates may share roleType.
 */
export function suggestUniqueRoleCode(input: {
  roleType: string;
  displayName: string;
  existingCodes: readonly string[];
}): string {
  const roleType = toRoleCodeSlug(input.roleType);
  const fromName = toRoleCodeSlug(input.displayName);
  const taken = normalizedCodeSet(input.existingCodes);

  const candidates: string[] = [];
  if (fromName.length > 0) {
    candidates.push(fromName);
    if (roleType.length > 0) {
      candidates.push(`${roleType}-${fromName}`);
    }
  }
  if (roleType.length > 0) {
    candidates.push(roleType);
  }

  for (const candidate of candidates) {
    if (candidate.length > 0 && !taken.has(candidate)) {
      return candidate;
    }
  }

  const base = roleType.length > 0 ? roleType : 'role';
  let index = 2;
  while (taken.has(`${base}-${index}`)) {
    index += 1;
  }
  return `${base}-${index}`;
}
