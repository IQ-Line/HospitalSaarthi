import type { QueryClient } from '@tanstack/react-query';

import { fetchAuthPrincipal, type AuthPrincipalResponse } from '@/lib/auth-principal';
import {
  authPrincipalQueryKeys,
  authPrincipalQueryOptions,
  isSameAuthPrincipalScope,
  type AuthPrincipalQueryScope,
} from '@/lib/auth-principal-query';

import { globalModulesCatalogQueryOptions } from '@/features/master-data/api/modules';
import { invalidateModuleRegistration } from '@/platform/modules/module-catalog';

import { hydrateCapabilitiesFromPrincipal } from '@/lib/permissions';

import { useAuthStore } from '@/stores/auth.store';

import { usePermissionsStore } from '@/stores/permissions.store';

import { useTenantStore } from '@/stores/tenant.store';

let lastHydratedPrincipalScope: AuthPrincipalQueryScope | null = null;
let lastModulesBootstrappedTenantId: string | null = null;

/** Resets hydration skip tracker (tests and logout paths). */
export function resetAuthorizationHydrationTracker(): void {
  lastHydratedPrincipalScope = null;
  lastModulesBootstrappedTenantId = null;
}

/** True when principal hydration completed for this auth scope (login + layout dedup). */
export function isAuthorizationHydratedForScope(scope: AuthPrincipalQueryScope): boolean {
  const { isLoaded } = usePermissionsStore.getState();
  return (
    isLoaded &&
    lastHydratedPrincipalScope !== null &&
    isSameAuthPrincipalScope(lastHydratedPrincipalScope, scope)
  );
}

/**
 * Single entry point for shell authorization after login, tenant switch, or session restore.
 * Capabilities are loaded only from `GET /auth/principal` (no client-side permission maps).
 */
export type RefreshAuthorizationContextOptions = {
  bypassEntitlementCache?: boolean;
  /** Re-hydrate capabilities even when scope unchanged (e.g. tenant module toggle). */
  forcePrincipalRefresh?: boolean;
  /** Skip global module catalog refetch (toggle already busted nav cache). */
  light?: boolean;
};

/** Clears permissions, resets hydration trackers, and drops cached principals. */
async function clearAuthorizationContext(queryClient: QueryClient): Promise<void> {
  usePermissionsStore.getState().clearPermissions();
  lastHydratedPrincipalScope = null;
  lastModulesBootstrappedTenantId = null;
  await queryClient.invalidateQueries({ queryKey: authPrincipalQueryKeys.all });
}

/**
 * True when login/tenant/session scope is complete enough to hydrate the principal.
 * Narrows `tenant.tenantId` to a non-null string: the body returns true only when
 * `tenant.tenantId?.trim()` is truthy, so callers past this guard can treat the
 * tenant id as present (e.g. bootstrapModulesForTenant) without a redundant check.
 */
function hasCompleteAuthorizationScope(
  auth: ReturnType<typeof useAuthStore.getState>,
  tenant: ReturnType<typeof useTenantStore.getState>,
): tenant is ReturnType<typeof useTenantStore.getState> & { tenantId: string } {
  return Boolean(
    auth.isAuthenticated && auth.userId && auth.accessToken?.trim() && tenant.tenantId?.trim(),
  );
}

/** True when the cached principal already covers this scope and may serve without a network call. */
function cachedPrincipalServesScope(
  scope: AuthPrincipalQueryScope,
  cachedPrincipal: AuthPrincipalResponse | undefined,
  options: RefreshAuthorizationContextOptions | undefined,
): boolean {
  const scopeUnchanged =
    lastHydratedPrincipalScope !== null &&
    isSameAuthPrincipalScope(lastHydratedPrincipalScope, scope);
  return (
    options?.forcePrincipalRefresh !== true &&
    scopeUnchanged &&
    cachedPrincipal !== undefined &&
    usePermissionsStore.getState().isLoaded
  );
}

/** Resolves the principal for this scope, preferring an unchanged cache hit over a fetch. */
async function resolvePrincipal(
  queryClient: QueryClient,
  scope: AuthPrincipalQueryScope,
  cachedPrincipal: AuthPrincipalResponse | undefined,
  options: RefreshAuthorizationContextOptions | undefined,
  scopeChanged: boolean,
): Promise<AuthPrincipalResponse> {
  if (!scopeChanged && cachedPrincipal !== undefined) {
    return cachedPrincipal;
  }
  if (options?.bypassEntitlementCache === true) {
    const principal = await fetchAuthPrincipal({ bypassEntitlementCache: true });
    queryClient.setQueryData(authPrincipalQueryKeys.detail(scope), principal);
    return principal;
  }
  return queryClient.fetchQuery(authPrincipalQueryOptions(scope));
}

/** Fetches/reuses the principal and hydrates capabilities, refreshing the scope tracker. */
async function hydratePrincipalForScope(
  queryClient: QueryClient,
  scope: AuthPrincipalQueryScope,
  cachedPrincipal: AuthPrincipalResponse | undefined,
  options: RefreshAuthorizationContextOptions | undefined,
): Promise<void> {
  const scopeChanged =
    lastHydratedPrincipalScope === null ||
    !isSameAuthPrincipalScope(lastHydratedPrincipalScope, scope);

  if (scopeChanged) {
    await queryClient.invalidateQueries({ queryKey: authPrincipalQueryKeys.all });
  }

  const principal = await resolvePrincipal(queryClient, scope, cachedPrincipal, options, scopeChanged);
  await hydrateCapabilitiesFromPrincipal(principal);
  lastHydratedPrincipalScope = scope;
}

/** Busts the tenant-scoped module registration cache once per tenant change. */
function bootstrapModulesForTenant(queryClient: QueryClient, tenantId: string): void {
  if (lastModulesBootstrappedTenantId !== tenantId) {
    invalidateModuleRegistration(queryClient, tenantId);
    lastModulesBootstrappedTenantId = tenantId;
  }
}

export async function refreshAuthorizationContext(
  queryClient: QueryClient,
  options?: RefreshAuthorizationContextOptions,
): Promise<void> {
  const auth = useAuthStore.getState();
  const tenant = useTenantStore.getState();

  if (!hasCompleteAuthorizationScope(auth, tenant)) {
    await clearAuthorizationContext(queryClient);
    return;
  }

  const scope: AuthPrincipalQueryScope = {
    userId: auth.userId,
    tenantId: tenant.tenantId,
    activeBranch: tenant.activeBranch,
  };

  const cachedPrincipal = queryClient.getQueryData<AuthPrincipalResponse>(
    authPrincipalQueryKeys.detail(scope),
  );

  if (!cachedPrincipalServesScope(scope, cachedPrincipal, options)) {
    await hydratePrincipalForScope(queryClient, scope, cachedPrincipal, options);
  }

  bootstrapModulesForTenant(queryClient, tenant.tenantId);

  if (options?.light !== true) {
    await queryClient.ensureQueryData(globalModulesCatalogQueryOptions());
  }
}
