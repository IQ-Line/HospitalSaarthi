import type { QueryClient } from '@tanstack/react-query';

import { fetchAuthPrincipal, type AuthPrincipalResponse } from '@/lib/auth-principal';
import {
  authPrincipalQueryKeys,
  authPrincipalQueryOptions,
  isSameAuthPrincipalScope,
  resolveAuthPrincipalQueryScope,
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

/**
 * Seeds principal cache and shell permissions from `POST /auth/login` — avoids an extra
 * `GET /auth/principal` round-trip on sign-in.
 */
export async function applyAuthorizationFromLogin(
  queryClient: QueryClient,
  principal: AuthPrincipalResponse,
): Promise<void> {
  const auth = useAuthStore.getState();
  const tenant = useTenantStore.getState();

  if (!auth.isAuthenticated || !auth.userId?.trim() || !tenant.tenantId?.trim()) {
    return;
  }

  const scope = resolveAuthPrincipalQueryScope({
    userId: auth.userId,
    homeTenantId: tenant.homeTenantId,
    activeTenantId: tenant.tenantId,
    activeBranch: tenant.activeBranch,
  });

  await queryClient.invalidateQueries({ queryKey: authPrincipalQueryKeys.all });
  queryClient.setQueryData(authPrincipalQueryKeys.detail(scope), principal);
  await hydrateCapabilitiesFromPrincipal(principal);
  lastHydratedPrincipalScope = scope;

  const tenantId = tenant.tenantId;
  invalidateModuleRegistration(queryClient, tenantId);
  lastModulesBootstrappedTenantId = tenantId;
  await queryClient.ensureQueryData(globalModulesCatalogQueryOptions());
}

export async function refreshAuthorizationContext(
  queryClient: QueryClient,
  options?: RefreshAuthorizationContextOptions,
): Promise<void> {
  const auth = useAuthStore.getState();
  const tenant = useTenantStore.getState();

  if (!auth.isAuthenticated || !auth.userId || !auth.accessToken?.trim()) {
    usePermissionsStore.getState().clearPermissions();
    lastHydratedPrincipalScope = null;
    lastModulesBootstrappedTenantId = null;
    await queryClient.invalidateQueries({ queryKey: authPrincipalQueryKeys.all });
    return;
  }

  if (!tenant.tenantId?.trim()) {
    usePermissionsStore.getState().clearPermissions();
    lastHydratedPrincipalScope = null;
    lastModulesBootstrappedTenantId = null;
    await queryClient.invalidateQueries({ queryKey: authPrincipalQueryKeys.all });
    return;
  }

  const scope = resolveAuthPrincipalQueryScope({
    userId: auth.userId,
    homeTenantId: tenant.homeTenantId,
    activeTenantId: tenant.tenantId,
    activeBranch: tenant.activeBranch,
  });

  const permissions = usePermissionsStore.getState();
  const cachedPrincipal = queryClient.getQueryData<AuthPrincipalResponse>(
    authPrincipalQueryKeys.detail(scope),
  );

  const scopeChanged =
    lastHydratedPrincipalScope === null ||
    !isSameAuthPrincipalScope(lastHydratedPrincipalScope, scope);

  const skipPrincipalNetwork =
    options?.forcePrincipalRefresh !== true &&
    !scopeChanged &&
    cachedPrincipal !== undefined &&
    permissions.isLoaded;

  if (!skipPrincipalNetwork) {
    if (scopeChanged) {
      await queryClient.invalidateQueries({ queryKey: authPrincipalQueryKeys.all });
    }

    let principal: AuthPrincipalResponse;
    if (!scopeChanged && cachedPrincipal !== undefined) {
      principal = cachedPrincipal;
    } else {
      principal =
        options?.bypassEntitlementCache === true
          ? await fetchAuthPrincipal({ bypassEntitlementCache: true })
          : await queryClient.fetchQuery(authPrincipalQueryOptions(scope));
      if (options?.bypassEntitlementCache === true) {
        queryClient.setQueryData(authPrincipalQueryKeys.detail(scope), principal);
      }
    }

    await hydrateCapabilitiesFromPrincipal(principal);
    lastHydratedPrincipalScope = scope;
  }

  const tenantId = tenant.tenantId;
  const modulesTenantChanged = lastModulesBootstrappedTenantId !== tenantId;

  if (modulesTenantChanged) {
    invalidateModuleRegistration(queryClient, tenantId);
    lastModulesBootstrappedTenantId = tenantId;
  }

  if (options?.light !== true) {
    await queryClient.ensureQueryData(globalModulesCatalogQueryOptions());
  }
}
