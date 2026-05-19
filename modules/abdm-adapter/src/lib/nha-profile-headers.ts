/** NHA profile routes expect `X-token: Bearer <jwt>` alongside gateway bearer. */
export function nhaProfileXTokenHeaders(profileJwt: string): Record<string, string> {
  const v = profileJwt.startsWith("Bearer ") ? profileJwt : `Bearer ${profileJwt}`;
  return { "X-token": v };
}
