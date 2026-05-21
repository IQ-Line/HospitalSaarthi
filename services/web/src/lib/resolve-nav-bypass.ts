import { resolvePlatformSuperAdmin } from '@/lib/platform-admin';
import { useAuthStore } from '@/stores/auth.store';
import { usePermissionsStore } from '@/stores/permissions.store';

/**
 * Platform super-admin UX: sidebar and layout route gates mirror tenant/catalog scope
 * without requiring every L2 capability on the principal. APIs and Cerbos stay authoritative.
 */
export function resolveNavigationCapabilityBypass(): boolean {
  return resolvePlatformSuperAdmin({
    principalRoles: usePermissionsStore.getState().roles,
    authRoles: useAuthStore.getState().roles,
    accessToken: useAuthStore.getState().accessToken,
  });
}
