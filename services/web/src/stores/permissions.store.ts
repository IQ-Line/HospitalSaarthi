import { create } from 'zustand';
import { devtools } from 'zustand/middleware';

type ActionPermissions = Record<string, boolean>;
type FeaturePermissions = Record<string, ActionPermissions>;
/** Cerbos-backed UX map from `GET /api/user-management/auth/permissions-map` (shell / gating only). */
export type PermissionMap = Record<string, FeaturePermissions>;

interface PermissionsState {
  map: PermissionMap;
  isLoaded: boolean;

  setPermissions: (map: PermissionMap) => void;
  clearPermissions: () => void;
  hasModuleAccess: (module: string) => boolean;
  hasFeaturePermission: (module: string, feature: string, action: string) => boolean;
}

export const usePermissionsStore = create<PermissionsState>()(
  devtools(
    (set, get) => ({
      map: {},
      isLoaded: false,

      setPermissions: (map) => set({ map, isLoaded: true }, false, 'setPermissions'),

      clearPermissions: () => set({ map: {}, isLoaded: false }, false, 'clearPermissions'),

      hasModuleAccess: (module) => {
        const features = get().map[module];
        if (!features) return false;
        return Object.values(features).some((actions) =>
          Object.values(actions).some((v) => v),
        );
      },

      hasFeaturePermission: (module, feature, action) => {
        return get().map[module]?.[feature]?.[action] ?? false;
      },
    }),
    { name: 'permissions' },
  ),
);
