/** Strip dashes/spaces — NHA `generate-token` / `link/carecontext` expect 14 plain digits. */
export function toGatewayAbhaNumberPlain(raw?: string): string | undefined {
  if (!raw?.trim()) return undefined;
  const digits = raw.replace(/\D/g, "");
  return digits.length === 14 ? digits : undefined;
}
