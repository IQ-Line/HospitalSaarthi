export function isPostgresErrorCode(error: unknown, code: string): boolean {
  let current: unknown = error;
  while (typeof current === "object" && current !== null) {
    if ("code" in current && (current as { code: unknown }).code === code) {
      return true;
    }
    if ("cause" in current) {
      current = (current as { cause: unknown }).cause;
      continue;
    }
    break;
  }
  return false;
}

export function isPostgresUniqueViolation(error: unknown): boolean {
  return isPostgresErrorCode(error, "23505");
}

export function isPostgresForeignKeyViolation(error: unknown): boolean {
  return isPostgresErrorCode(error, "23503");
}
