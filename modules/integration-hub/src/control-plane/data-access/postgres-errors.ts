export function isPostgresErrorCode(error: unknown, code: string): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code: unknown }).code === code
  );
}

export function isPostgresUniqueViolation(error: unknown): boolean {
  return isPostgresErrorCode(error, "23505");
}
