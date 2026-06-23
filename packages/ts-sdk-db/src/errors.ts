/**
 * pg driver SQLSTATE helpers, shared across modules.
 *
 * drizzle-orm 0.45 wraps the underlying pg driver error in a DrizzleQueryError
 * whose top-level `.code` is `undefined`; the real SQLSTATE lives on `.cause`
 * (the driver's DatabaseError). This holds for both plain queries and queries
 * inside `db.transaction(...)`, so a top-level-only `.code === '23505'` check
 * silently misses every violation — exactly the bug that independently broke the
 * idempotency / duplicate-detection retries in several modules. These helpers
 * recurse into `.cause` (bounded depth, cycle-safe) so callers match the real code.
 */
function hasPostgresCode(error: unknown, code: string, depth = 5): boolean {
  if (depth < 0 || typeof error !== "object" || error === null) return false;
  if ((error as { code?: unknown }).code === code) return true;
  return hasPostgresCode((error as { cause?: unknown }).cause, code, depth - 1);
}

/** 23505 unique_violation — e.g. a racing insert that loses a (partial) unique index. */
export function isPostgresUniqueViolation(error: unknown): boolean {
  return hasPostgresCode(error, "23505");
}

/** 23503 foreign_key_violation — e.g. a grant referencing a non-existent role. */
export function isPostgresForeignKeyViolation(error: unknown): boolean {
  return hasPostgresCode(error, "23503");
}
