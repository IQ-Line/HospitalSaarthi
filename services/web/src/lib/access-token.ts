/** Decoded JWT payload shape for HIMS access tokens (identity claims only; not verified client-side). */
export type AccessTokenPayload = {
  roles?: string[];
  /** Legacy/single-role claim when `roles` is absent. */
  user_role?: string;
  iq_tenant_id?: string;
  org_id?: string | null;
  sub?: string;
  [key: string]: unknown;
};

function decodeBase64Url(segment: string): string {
  const padded = segment.replace(/-/g, '+').replace(/_/g, '/');
  const padLen = (4 - (padded.length % 4)) % 4;
  const base64 = padded + '='.repeat(padLen);
  return atob(base64);
}

/** Returns parsed JWT payload, or null when the token is missing or not a JWT. */
export function decodeAccessTokenPayload(accessToken: string | null | undefined): AccessTokenPayload | null {
  const parts = accessToken?.split('.');
  const payloadSegment = parts?.[1];
  if (!parts || parts.length !== 3 || payloadSegment === undefined) {
    return null;
  }

  try {
    const json = decodeBase64Url(payloadSegment);
    return JSON.parse(json) as AccessTokenPayload;
  } catch {
    return null;
  }
}

/** Role codes from the access JWT (`roles` or `user_role` claim). Empty when not a JWT or claim absent. */
export function getRolesFromAccessToken(accessToken: string | null | undefined): string[] {
  const payload = decodeAccessTokenPayload(accessToken);
  if (!payload) {
    return [];
  }
  if (Array.isArray(payload.roles)) {
    const roles = payload.roles.filter(
      (role): role is string => typeof role === 'string' && role.length > 0,
    );
    if (roles.length > 0) {
      return roles;
    }
  }
  if (typeof payload.user_role === 'string' && payload.user_role.length > 0) {
    return [payload.user_role];
  }
  return [];
}

export function isSuperAdminRole(roles: readonly string[]): boolean {
  return roles.includes('super-admin');
}
