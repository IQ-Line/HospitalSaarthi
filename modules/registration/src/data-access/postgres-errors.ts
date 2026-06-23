/**
 * Narrow pg driver error-code helpers.
 *
 * NOTE: interim per-module duplication. pharmacy, record-foundation, and
 * user-management each carry a near-identical copy. The canonical home is
 * `@hims/ts-sdk-db` (every module already depends on it and imports drizzle
 * operators from it), and these copies should be promoted there and deleted —
 * see the SDK-consolidation follow-up. Kept local here only to keep this fix
 * scoped; it is NOT that a shared SDK helper is disallowed.
 */

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
 * 23505 unique_violation — e.g. a racing concurrent intake that loses the
 * partial unique index on (iq_tenant_id, idempotency_key) or (iq_tenant_id,
 * patient_id), driving the idempotency-replay retry in the visit/registration
 * repos.
 */
export function isPostgresUniqueViolation(error: unknown): boolean {
  return hasPostgresCode(error, "23505");
}
