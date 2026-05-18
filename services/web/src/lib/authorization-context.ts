import type { QueryClient } from '@tanstack/react-query';
import { authPrincipalQueryKeys, authPrincipalQueryOptions } from '@/lib/auth-principal-query';
import { hydratePermissionsFromBackend } from '@/lib/permissions';
import { useAuthStore } from '@/stores/auth.store';
import { usePermissionsStore } from '@/stores/permissions.store';
import { useTenantStore } from '@/stores/tenant.store';

export async function refreshAuthorizationContext(queryClient: QueryClient): Promise<void> {
  const auth = useAuthStore.getState();
  const tenant = useTenantStore.getState();

  if (!auth.isAuthenticated || !auth.userId || !tenant.tenantId) {
    usePermissionsStore.getState().clearPermissions();
    await queryClient.invalidateQueries({ queryKey: authPrincipalQueryKeys.all });
    return;
  }

  const scope = {
    userId: auth.userId,
    tenantId: tenant.tenantId,
    activeBranch: tenant.activeBranch,
  };

  await Promise.allSettled([
    queryClient.invalidateQueries({ queryKey: authPrincipalQueryKeys.all }),
    queryClient.fetchQuery(authPrincipalQueryOptions(scope)),
    hydratePermissionsFromBackend(),
  ]);
}
