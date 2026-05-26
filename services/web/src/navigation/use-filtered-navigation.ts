import { useMemo } from 'react';
import { useComposedNavigationManifest } from '@/platform/modules/use-composed-navigation';
import { useModuleCatalog } from '@/platform/modules/module-catalog';
import { useEnabledTenantModuleSlugs } from '@/platform/modules/use-enabled-tenant-modules';
import { applyCatalogNavigationLabels } from './apply-catalog-navigation-labels';
import { normalizeCapabilityKey } from '@/lib/principal-capabilities';
import { resolvePlatformSuperAdmin, resolveTenantAdmin } from '@/lib/platform-admin';
import { resolveNavigationCapabilityBypass } from '@/lib/resolve-nav-bypass';
import { useAuthStore } from '@/stores/auth.store';
import { usePermissionsStore } from '@/stores/permissions.store';
import { capabilityKeysGrantProductAccess } from './module-product-access';
import { buildNavCapabilityAccessInput } from './nav-capability-access';
import { filterNavigationTree } from './filter-navigation-tree';
import type { NavFilterContext } from './types';

/** Pure filter context from principal capability keys and resolved tenant module slugs. */
export function buildNavFilterContext(
  capabilityKeys: ReadonlySet<string>,
  enabledModuleSlugs: ReadonlySet<string> | null,
  options?: {
    bypassCapabilityGates?: boolean;
    isSuperAdmin?: boolean;
    isTenantAdmin?: boolean;
    catalogIndex?: import('@/platform/modules/types').ModuleCatalogIndex | null;
  },
): NavFilterContext {
  const bypassCapabilityGates = options?.bypassCapabilityGates === true;
  const isSuperAdmin = options?.isSuperAdmin === true;
  const isTenantAdmin = options?.isTenantAdmin === true;
  const catalogIndex = options?.catalogIndex ?? null;

  const hasAnyCapabilityForProduct = (catalogProductSlugs: readonly string[]) =>
    bypassCapabilityGates ||
    capabilityKeysGrantProductAccess(capabilityKeys, catalogProductSlugs, catalogIndex);

  const navAccess = buildNavCapabilityAccessInput(
    capabilityKeys,
    catalogIndex,
    bypassCapabilityGates,
    hasAnyCapabilityForProduct,
  );

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
    hasAnyCapabilityForProduct,
    navAccess,
    enabledModuleSlugs,
    bypassCapabilityGates,
    isSuperAdmin,
    isTenantAdmin,
    catalogIndex,
  };
}

export function useFilteredNavigation() {
  const manifest = useComposedNavigationManifest();
  const capabilityKeys = usePermissionsStore((s) => s.capabilityKeys);
  const principalRoles = usePermissionsStore((s) => s.roles);
  const permissionsLoaded = usePermissionsStore((s) => s.isLoaded);
  const authRoles = useAuthStore((s) => s.roles);
  const accessToken = useAuthStore((s) => s.accessToken);
  const enabledModuleSlugs = useEnabledTenantModuleSlugs();
  const { index: catalogIndex } = useModuleCatalog();
  const bypassCapabilityGates = resolveNavigationCapabilityBypass();
  const isSuperAdmin = resolvePlatformSuperAdmin({ principalRoles, authRoles, accessToken });
  const isTenantAdmin = resolveTenantAdmin({ principalRoles, authRoles, accessToken });

  return useMemo(() => {
    const filtered = filterNavigationTree(
      manifest,
      buildNavFilterContext(capabilityKeys, enabledModuleSlugs, {
        bypassCapabilityGates,
        isSuperAdmin,
        isTenantAdmin,
        catalogIndex: catalogIndex ?? null,
      }),
    );
    return applyCatalogNavigationLabels(filtered, catalogIndex);
  }, [
    manifest,
    capabilityKeys,
    principalRoles,
    authRoles,
    accessToken,
    permissionsLoaded,
    enabledModuleSlugs,
    bypassCapabilityGates,
    isSuperAdmin,
    isTenantAdmin,
    catalogIndex,
  ]);
}
