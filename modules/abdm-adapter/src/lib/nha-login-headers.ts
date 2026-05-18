/** Mobile login verify/user expects `T-token: Bearer <transfer jwt>` (Postman + NHA §7.4). */
export function nhaLoginTTokenHeaders(transferJwt: string): Record<string, string> {
  const v = transferJwt.startsWith("Bearer ") ? transferJwt : `Bearer ${transferJwt}`;
  return { "T-token": v };
}
