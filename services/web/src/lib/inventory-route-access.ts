import { redirect } from '@tanstack/react-router';
import { principalGrantsProductSubtreeRouteAccess } from '@/lib/catalog-route-access';
import { resolveNavigationCapabilityBypass } from '@/lib/resolve-nav-bypass';
import {
  INVENTORY_CATALOG_PRODUCT_SLUGS,
  resolveInventoryCatalogModuleSlug,
} from '@/features/inventory/lib/inventory-access';
import { usePermissionsStore } from '@/stores/permissions.store';

export function principalGrantsInventoryRouteAccess(
  capabilityKeys: ReadonlySet<string>,
  route: string,
): boolean {
  return principalGrantsProductSubtreeRouteAccess(capabilityKeys, {
    productSlugs: INVENTORY_CATALOG_PRODUCT_SLUGS,
    routeModuleSlugs: [resolveInventoryCatalogModuleSlug(route)],
    route,
  });
}

export function requireInventoryRouteAccess(route: string) {
  return () => {
    if (resolveNavigationCapabilityBypass()) {
      return;
    }
    const capabilityKeys = usePermissionsStore.getState().capabilityKeys;
    if (!principalGrantsInventoryRouteAccess(capabilityKeys, route)) {
      throw redirect({ to: '/dashboard' });
    }
  };
}
