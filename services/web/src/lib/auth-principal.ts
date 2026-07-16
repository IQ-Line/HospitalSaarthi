import type { Principal, Value } from '@cerbos/core';
import { apiClient } from '@/lib/api-client';
import { useTenantStore } from '@/stores/tenant.store';

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
  // Principal is always home-tenant identity. Active facility (superadmin switcher)
  // must not rewrite the UM iq_tenant_id header for this route.
  const homeTenantId = useTenantStore.getState().homeTenantId?.trim() || null;
  return apiClient<AuthPrincipalResponse>(
    AUTH_PRINCIPAL_PATH,
    { method: 'GET', headers },
    homeTenantId ? { tenantIdOverride: homeTenantId } : undefined,
  );
}

/** Maps the user-management auth principal to Cerbos `Principal` (`attributes` → `attr`). */
export function authPrincipalToCerbosPrincipal(payload: AuthPrincipalResponse): Principal {
  return {
    id: payload.id,
    roles: payload.roles,
    attr: payload.attributes as Record<string, Value>,
  };
}
