import { resolvePlatformSuperAdmin, resolveTenantAdmin } from '@/lib/platform-admin';
import { useAuthStore } from '@/stores/auth.store';
import { usePermissionsStore } from '@/stores/permissions.store';

/**
 * Platform super-admin and tenant-admin UX: sidebar and layout route gates mirror
 * tenant/catalog scope without requiring every L2 capability on the principal.
 * APIs and Cerbos stay authoritative.
 */
export function resolveNavigationCapabilityBypass(): boolean {
  const principalRoles = usePermissionsStore.getState().roles;
  const authRoles = useAuthStore.getState().roles;
  const accessToken = useAuthStore.getState().accessToken;
  return (
    resolvePlatformSuperAdmin({ principalRoles, authRoles, accessToken }) ||
    resolveTenantAdmin({ principalRoles, authRoles, accessToken })
  );
}
