type LinkTokenJwtPayload = {
  exp?: number;
  sub?: string;
  abhaAddress?: string;
  abha_address?: string;
  preferred_username?: string;
  abha?: string;
};

function decodeLinkTokenJwtPayload(linkToken: string): LinkTokenJwtPayload | null {
  const parts = linkToken.split(".");
  if (parts.length < 2) return null;
  try {
    return JSON.parse(
      Buffer.from(parts[1]!.replace(/-/g, "+").replace(/_/g, "/"), "base64").toString(
        "utf8",
      ),
    ) as LinkTokenJwtPayload;
  } catch {
    return null;
  }
}

/** Decode JWT claims without verifying signature — TTL / ABHA from gateway token. */
export function decodeLinkTokenPayload(
  linkToken: string,
): LinkTokenJwtPayload | null {
  return decodeLinkTokenJwtPayload(linkToken);
}

/** Decode JWT `exp` (seconds) without verifying signature — TTL from gateway token. */
export function decodeLinkTokenExpSeconds(linkToken: string): number | null {
  const payload = decodeLinkTokenJwtPayload(linkToken);
  return typeof payload?.exp === "number" ? payload.exp : null;
}

export function linkTokenExpiresAt(linkToken: string): Date {
  const exp = decodeLinkTokenExpSeconds(linkToken);
  if (exp) {
    return new Date(exp * 1000);
  }
  return new Date(Date.now() + 15 * 60 * 1000);
}
