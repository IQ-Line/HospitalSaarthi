/**
 * Canonical role code normalization — must match persisted shape
 * (`roles_code_canonical_chk`: `lower(btrim(code))`).
 *
 * Callers treat an empty result as invalid / omit from sets (blank codes rejected).
 */
export function normalizeRoleCode(roleCode: string): string {
  return roleCode.trim().toLowerCase();
}

/** Lexical UTF-16 code unit order; deterministic and locale-independent. */
export function compareCanonicalRoleCodes(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0;
}
