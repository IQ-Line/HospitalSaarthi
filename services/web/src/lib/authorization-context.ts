import type { QueryClient } from '@tanstack/react-query';

import { authPrincipalQueryKeys, authPrincipalQueryOptions } from '@/lib/auth-principal-query';

import {
  invalidateModuleRegistration,
  moduleCatalogQueryOptions,
} from '@/platform/modules/module-catalog';
import { platformCatalogClient } from '@/features/master-data/api/platform-catalog-client';
import { masterDataKeys } from '@/features/master-data/api/query-keys';
import type { ModuleListResponse } from '@/features/master-data/types';

import { hydrateCapabilitiesFromPrincipal } from '@/lib/permissions';

import { useAuthStore } from '@/stores/auth.store';

import { usePermissionsStore } from '@/stores/permissions.store';

import { useTenantStore } from '@/stores/tenant.store';

/**
 * Single entry point for shell authorization after login, tenant switch, or session restore.
 * Capabilities are loaded only from `GET /auth/principal` (no client-side permission maps).
 */
export async function refreshAuthorizationContext(queryClient: QueryClient): Promise<void> {
  const auth = useAuthStore.getState();
  const tenant = useTenantStore.getState();

  if (!auth.isAuthenticated || !auth.userId || !auth.accessToken?.trim()) {
    usePermissionsStore.getState().clearPermissions();
    await queryClient.invalidateQueries({ queryKey: authPrincipalQueryKeys.all });
    return;
  }

  if (!tenant.tenantId?.trim()) {
    usePermissionsStore.getState().clearPermissions();
    await queryClient.invalidateQueries({ queryKey: authPrincipalQueryKeys.all });
    return;
  }

  const scope = {
    userId: auth.userId,
    tenantId: tenant.tenantId,
    activeBranch: tenant.activeBranch,
  };

  await queryClient.invalidateQueries({ queryKey: authPrincipalQueryKeys.all });
  const principal = await queryClient.fetchQuery(authPrincipalQueryOptions(scope));
  await hydrateCapabilitiesFromPrincipal(principal);

  invalidateModuleRegistration(queryClient, tenant.tenantId);

  await queryClient
    .fetchQuery({
      ...moduleCatalogQueryOptions(),
      queryFn: () =>
        platformCatalogClient<ModuleListResponse>('/api/v1/master-data/modules', {
          method: 'GET',
        }),
    })
    .catch(() => {
      queryClient.removeQueries({ queryKey: masterDataKeys.globalModules() });
    });
}
