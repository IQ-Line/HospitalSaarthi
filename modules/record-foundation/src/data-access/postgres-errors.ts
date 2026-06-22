/** Narrow pg driver error-code helpers (no cross-module import of UM's copy). */

/**
 * Match a pg SQLSTATE, unwrapping `.cause` — drizzle-orm wraps the driver error
 * in a DrizzleQueryError whose `.cause` carries the real pg error (and its `.code`).
 * Recurses a bounded number of levels to survive multi-layer wrapping.
 */
function hasPostgresCode(error: unknown, code: string, depth = 5): boolean {
  if (depth < 0 || typeof error !== "object" || error === null) return false;
  if ((error as { code?: unknown }).code === code) return true;
  return hasPostgresCode((error as { cause?: unknown }).cause, code, depth - 1);
}

/** 23505 unique_violation — the source-tuple dedup key was already taken. */
export function isPostgresUniqueViolation(error: unknown): boolean {
  return hasPostgresCode(error, "23505");
}

/** 23503 foreign_key_violation — e.g. a bundle referencing a missing care context. */
export function isPostgresForeignKeyViolation(error: unknown): boolean {
  return hasPostgresCode(error, "23503");
}
