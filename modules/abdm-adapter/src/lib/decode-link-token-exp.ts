/** Decode JWT `exp` (seconds) without verifying signature — TTL from gateway token. */
export function decodeLinkTokenExpSeconds(linkToken: string): number | null {
  const parts = linkToken.split(".");
  if (parts.length < 2) return null;
  try {
    const payload = JSON.parse(
      Buffer.from(parts[1]!.replace(/-/g, "+").replace(/_/g, "/"), "base64").toString(
        "utf8",
      ),
    ) as { exp?: number };
    return typeof payload.exp === "number" ? payload.exp : null;
  } catch {
    return null;
  }
}

export function linkTokenExpiresAt(linkToken: string): Date {
  const exp = decodeLinkTokenExpSeconds(linkToken);
  if (exp) {
    return new Date(exp * 1000);
  }
  return new Date(Date.now() + 15 * 60 * 1000);
}
