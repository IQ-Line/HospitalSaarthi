import { useMemo } from 'react';
import { useComposedNavigationManifest } from '@/platform/modules/use-composed-navigation';
import { useEnabledTenantModuleSlugs } from '@/platform/modules/use-enabled-tenant-modules';
import { usePermissionsStore } from '@/stores/permissions.store';
import { filterNavigationTree } from './filter-navigation-tree';

export function useFilteredNavigation() {
  const manifest = useComposedNavigationManifest();
  const hasCapability = usePermissionsStore((s) => s.hasCapability);
  const hasAnyCapability = usePermissionsStore((s) => s.hasAnyCapability);
  const hasAllCapabilities = usePermissionsStore((s) => s.hasAllCapabilities);
  const enabledModuleSlugs = useEnabledTenantModuleSlugs();

  return useMemo(
    () =>
      filterNavigationTree(manifest, {
        hasCapability,
        hasAnyCapability,
        hasAllCapabilities,
        enabledModuleSlugs,
      }),
    [manifest, hasCapability, hasAnyCapability, hasAllCapabilities, enabledModuleSlugs],
  );
}
