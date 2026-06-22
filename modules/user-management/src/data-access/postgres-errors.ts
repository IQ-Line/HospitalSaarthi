export function isPostgresErrorCode(error: unknown, code: string, depth = 5): boolean {
  if (depth < 0 || typeof error !== "object" || error === null) return false;
  if ((error as { code?: unknown }).code === code) return true;
  // drizzle-orm wraps the driver error in a DrizzleQueryError whose `.cause`
  // carries the real pg error (and its SQLSTATE). A top-level-only check misses
  // it — so a duplicate-username insert would NOT be caught and the rollback
  // path (DuplicateUsernameError) would silently not fire. Unwrap `.cause`.
  return isPostgresErrorCode((error as { cause?: unknown }).cause, code, depth - 1);
}

export function isPostgresUniqueViolation(error: unknown): boolean {
  return isPostgresErrorCode(error, "23505");
}

export function isPostgresForeignKeyViolation(error: unknown): boolean {
  return isPostgresErrorCode(error, "23503");
}
