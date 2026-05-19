import { create, type StateCreator } from 'zustand';
import { devtools } from 'zustand/middleware';

type ActionPermissions = Record<string, boolean>;
type FeaturePermissions = Record<string, ActionPermissions>;
/** Cerbos-backed UX map from `GET /api/user-management/auth/permissions-map` (shell / gating only). */
export type PermissionMap = Record<string, FeaturePermissions>;

export interface PermissionsState {
  map: PermissionMap;
  isLoaded: boolean;

  setPermissions: (map: PermissionMap) => void;
  clearPermissions: () => void;
  hasModuleAccess: (module: string) => boolean;
  hasFeaturePermission: (module: string, feature: string, action: string) => boolean;
}

const DEV_PERMISSIONS_STORAGE_KEY = 'hims-dev-permissions';

const permissionsSlice: StateCreator<PermissionsState> = (set, get) => ({
  map: {},
  isLoaded: false,

  setPermissions: (map) => set({ map, isLoaded: true }, false, 'setPermissions'),

  clearPermissions: () => {
    if (import.meta.env.DEV && typeof sessionStorage !== 'undefined') {
      sessionStorage.removeItem(DEV_PERMISSIONS_STORAGE_KEY);
    }
    set({ map: {}, isLoaded: false }, false, 'clearPermissions');
  },

  hasModuleAccess: (module) => {
    const features = get().map[module];
    if (!features) return false;
    return Object.values(features).some((actions) => Object.values(actions).some((v) => v));
  },

  hasFeaturePermission: (module, feature, action) => {
    return get().map[module]?.[feature]?.[action] === true;
  },
});

export const usePermissionsStore = create<PermissionsState>()(
  devtools(permissionsSlice, { name: 'permissions' }),
);
