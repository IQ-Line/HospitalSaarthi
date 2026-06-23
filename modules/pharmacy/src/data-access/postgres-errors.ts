/** Narrow pg driver error-code helpers (no cross-module import of UM's copy). */

/**
 * Match a pg SQLSTATE, unwrapping `.cause` — drizzle-orm wraps the driver error
 * in a DrizzleQueryError whose top-level `.code` is undefined and whose `.cause`
 * carries the real pg error (and its `.code`). This holds for both plain queries
 * and queries inside `db.transaction(...)`, so a top-level-only `.code` check
 * silently misses every violation. Recurses a bounded number of levels to
 * survive multi-layer wrapping, and is cycle-safe.
 */
function hasPostgresCode(error: unknown, code: string, depth = 5): boolean {
  if (depth < 0 || typeof error !== "object" || error === null) return false;
  if ((error as { code?: unknown }).code === code) return true;
  return hasPostgresCode((error as { cause?: unknown }).cause, code, depth - 1);
}

/**
 * 23505 unique_violation — e.g. a racing concurrent dispense upsert that loses
 * the partial unique index on (iq_tenant_id, visit_id), driving the retry path.
 */
export function isPostgresUniqueViolation(error: unknown): boolean {
  return hasPostgresCode(error, "23505");
}
