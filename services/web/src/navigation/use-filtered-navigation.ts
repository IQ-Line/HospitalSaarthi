import { useMemo } from 'react';
import { useComposedNavigationManifest } from '@/platform/modules/use-composed-navigation';
import { useEnabledTenantModuleSlugs } from '@/platform/modules/use-enabled-tenant-modules';
import { isPlatformSuperAdmin, isPlatformSuperAdminFromAccessToken } from '@/lib/platform-admin';
import { normalizeCapabilityKey } from '@/lib/principal-capabilities';
import { useAuthStore } from '@/stores/auth.store';
import { usePermissionsStore } from '@/stores/permissions.store';
import { filterNavigationTree } from './filter-navigation-tree';
import type { NavFilterContext } from './types';

/** Pure filter context from principal capability keys and resolved tenant module slugs. */
export function buildNavFilterContext(
  capabilityKeys: ReadonlySet<string>,
  enabledModuleSlugs: ReadonlySet<string> | null,
  options?: { bypassCapabilityGates?: boolean },
): NavFilterContext {
  const bypassCapabilityGates = options?.bypassCapabilityGates === true;

  return {
    hasCapability: (key) =>
      bypassCapabilityGates || capabilityKeys.has(normalizeCapabilityKey(key)),
    hasAnyCapability: (keys) => {
      if (bypassCapabilityGates) {
        return true;
      }
      if (keys.length === 0) {
        return false;
      }
      return keys.some((key) => capabilityKeys.has(normalizeCapabilityKey(key)));
    },
    hasAllCapabilities: (keys) => {
      if (bypassCapabilityGates) {
        return true;
      }
      if (keys.length === 0) {
        return false;
      }
      return keys.every((key) => capabilityKeys.has(normalizeCapabilityKey(key)));
    },
    enabledModuleSlugs,
    bypassCapabilityGates,
  };
}

export function useFilteredNavigation() {
  const manifest = useComposedNavigationManifest();
  const capabilityKeys = usePermissionsStore((s) => s.capabilityKeys);
  const principalRoles = usePermissionsStore((s) => s.roles);
  const permissionsLoaded = usePermissionsStore((s) => s.isLoaded);
  const accessToken = useAuthStore((s) => s.accessToken);
  const enabledModuleSlugs = useEnabledTenantModuleSlugs();
  const bypassCapabilityGates =
    isPlatformSuperAdmin(principalRoles) || isPlatformSuperAdminFromAccessToken(accessToken);

  return useMemo(
    () =>
      filterNavigationTree(
        manifest,
        buildNavFilterContext(capabilityKeys, enabledModuleSlugs, { bypassCapabilityGates }),
      ),
    [manifest, capabilityKeys, permissionsLoaded, enabledModuleSlugs, bypassCapabilityGates],
  );
}
