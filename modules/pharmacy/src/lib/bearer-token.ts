export function bearerTokenFromHeaders(
  headers: Record<string, unknown>,
): string | undefined {
  const raw = headers.authorization;
  if (typeof raw !== "string") return undefined;
  if (!raw.startsWith("Bearer ")) return undefined;
  const token = raw.slice(7).trim();
  return token.length > 0 ? token : undefined;
}
