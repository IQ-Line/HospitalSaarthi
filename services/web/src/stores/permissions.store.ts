import { create, type StateCreator } from 'zustand';
import { createJSONStorage, devtools, persist } from 'zustand/middleware';

type ActionPermissions = Record<string, boolean>;
type FeaturePermissions = Record<string, ActionPermissions>;
type PermissionMap = Record<string, FeaturePermissions>;

export interface PermissionsState {
  map: PermissionMap;
  isLoaded: boolean;

  setPermissions: (map: PermissionMap) => void;
  clearPermissions: () => void;
  hasModuleAccess: (module: string) => boolean;
  hasFeaturePermission: (module: string, feature: string, action: string) => boolean;
}

const permissionsSlice: StateCreator<PermissionsState> = (set, get) => ({
  map: {},
  isLoaded: false,

  setPermissions: (map) => set({ map, isLoaded: true }, false, 'setPermissions'),

  clearPermissions: () => set({ map: {}, isLoaded: false }, false, 'clearPermissions'),

  hasModuleAccess: (module) => {
    const features = get().map[module];
    if (!features) return false;
    return Object.values(features).some((actions) => Object.values(actions).some((v) => v));
  },

  hasFeaturePermission: (module, feature, action) => {
    return get().map[module]?.[feature]?.[action] ?? false;
  },
});

const permissionsStoreCreator = import.meta.env.DEV
  ? persist(permissionsSlice, {
      name: 'hims-dev-permissions',
      storage: createJSONStorage(() => sessionStorage),
      partialize: (s) => ({ map: s.map, isLoaded: s.isLoaded }),
    })
  : permissionsSlice;

export const usePermissionsStore = create<PermissionsState>()(
  devtools(permissionsStoreCreator, { name: 'permissions' }),
);
