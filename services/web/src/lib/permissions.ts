import { apiClient } from '@/lib/api-client';
import { usePermissionsStore, type PermissionMap } from '@/stores/permissions.store';

/**
 * Reads the global permission map (Zustand). Prefer {@link hydratePermissionsFromBackend} after login.
 */
export function hasModuleAccess(module: string): boolean {
  return usePermissionsStore.getState().hasModuleAccess(module);
}

export function hasFeaturePermission(module: string, feature: string, action: string): boolean {
  return usePermissionsStore.getState().hasFeaturePermission(module, feature, action);
}

const PERMISSIONS_MAP_PATH = '/api/user-management/auth/permissions-map';

type PermissionsMapResponse = { map: PermissionMap };

/**
 * Fetches the Cerbos-derived UX permission map from User Management and hydrates the Zustand store.
 * Shell/navigation only — APIs remain the security boundary.
 *
 * For fine-grained checks, use `@cerbos/react` (`useIsAllowed`, …) under `app/providers.tsx`
 * (`AppProviders`) — the Cerbos `Principal` is hydrated from `GET /auth/principal` to match PEP.
 */
export async function hydratePermissionsFromBackend(): Promise<void> {
  const data = await apiClient<PermissionsMapResponse>(PERMISSIONS_MAP_PATH, { method: 'GET' });
  usePermissionsStore.getState().setPermissions(data.map);
}
