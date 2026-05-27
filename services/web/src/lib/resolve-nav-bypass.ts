import { resolvePlatformSuperAdmin } from '@/lib/platform-admin';
import { useAuthStore } from '@/stores/auth.store';
import { usePermissionsStore } from '@/stores/permissions.store';

/**
 * Platform super-admin only: sidebar and layout route gates show full Visitpad nav without
 * every L2 capability on the principal. Tenant-admins remain capability-gated in the UI.
 * APIs and Cerbos stay authoritative.
 */
export function resolveNavigationCapabilityBypass(): boolean {
  const principalRoles = usePermissionsStore.getState().roles;
  const authRoles = useAuthStore.getState().roles;
  return resolvePlatformSuperAdmin({ principalRoles, authRoles });
}
