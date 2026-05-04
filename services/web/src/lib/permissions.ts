import { usePermissionsStore } from '@/stores/permissions.store';

export function hasModuleAccess(module: string): boolean {
  return usePermissionsStore.getState().hasModuleAccess(module);
}

export function hasFeaturePermission(
  module: string,
  feature: string,
  action: string,
): boolean {
  return usePermissionsStore.getState().hasFeaturePermission(module, feature, action);
}
