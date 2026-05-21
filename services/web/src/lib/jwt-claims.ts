/** Decoded HIMS access JWT identity claims (no signature verification — UX only). */
export type HimsAccessJwtClaims = {
  sub?: string;
  iq_tenant_id?: string;
  org_id?: string | null;
  roles?: string[];
};

function decodeBase64Url(segment: string): string {
  const padded = segment.replace(/-/g, '+').replace(/_/g, '/');
  const padLen = (4 - (padded.length % 4)) % 4;
  return atob(padded + '='.repeat(padLen));
}

/** Best-effort parse of JWT payload; returns `{}` when token is not a JWT. */
export function parseAccessJwtClaims(accessToken: string | null | undefined): HimsAccessJwtClaims {
  if (accessToken == null || accessToken.trim() === '') {
    return {};
  }
  const parts = accessToken.split('.');
  if (parts.length !== 3) {
    return {};
  }
  try {
    const json = decodeBase64Url(parts[1] ?? '');
    return JSON.parse(json) as HimsAccessJwtClaims;
  } catch {
    return {};
  }
}
