import type { Principal, Value } from '@cerbos/core';
import { apiClient } from '@/lib/api-client';

/** Body of `GET /api/user-management/auth/principal` (OpenAPI `Principal`). */
export type AuthPrincipalResponse = {
  id: string;
  roles: string[];
  attributes: Record<string, unknown>;
};

const AUTH_PRINCIPAL_PATH = '/api/user-management/auth/principal';

export type FetchAuthPrincipalOptions = {
  /** Skips UM entitlement TTL cache — use after tenant module toggle. */
  bypassEntitlementCache?: boolean;
};

export async function fetchAuthPrincipal(
  options?: FetchAuthPrincipalOptions,
): Promise<AuthPrincipalResponse> {
  const headers =
    options?.bypassEntitlementCache === true
      ? { 'x-bypass-entitlement-cache': 'true' }
      : undefined;
  return apiClient<AuthPrincipalResponse>(AUTH_PRINCIPAL_PATH, { method: 'GET', headers });
}

/** Maps the user-management auth principal to Cerbos `Principal` (`attributes` → `attr`). */
export function authPrincipalToCerbosPrincipal(payload: AuthPrincipalResponse): Principal {
  return {
    id: payload.id,
    roles: payload.roles,
    attr: payload.attributes as Record<string, Value>,
  };
}
