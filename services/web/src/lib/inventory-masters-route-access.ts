import {
  assertInventorySupplyMastersTenantAdmin,
  catalogModuleSlugForInventoryMasterTab,
  isInventorySupplyMastersTenantAdminPrincipal,
  principalGrantsInventoryMasterRouteAccess,
} from '@/features/inventory-masters/lib/inventory-masters-access';
import type { InventoryMasterTabId } from '@/features/inventory-masters/types';
import { getInventoryMasterTabConfig } from '@/features/inventory-masters/inventory-masters-nav-model';
import { requireCatalogRouteAccess } from '@/lib/require-catalog-route-access';

export function requireInventoryMasterTabAccess(tabId: InventoryMasterTabId) {
  const tab = getInventoryMasterTabConfig(tabId);
  return () => {
    assertInventorySupplyMastersTenantAdmin();
    if (isInventorySupplyMastersTenantAdminPrincipal()) {
      return;
    }
    requireCatalogRouteAccess(tab.route, {
      catalogProductSlugs: ['inventory-master'],
      routePrefix: '/inventory-supply-masters',
      catalogModuleSlug: catalogModuleSlugForInventoryMasterTab(tabId),
    })();
  };
}

export function requireInventorySupplyMastersLayoutAccess() {
  return () => {
    assertInventorySupplyMastersTenantAdmin();
    if (isInventorySupplyMastersTenantAdminPrincipal()) {
      return;
    }
    requireCatalogRouteAccess('/inventory-supply-masters', {
      catalogProductSlugs: ['inventory-master'],
      routePrefix: '/inventory-supply-masters',
      catalogModuleSlug: 'inventory-master',
    })();
  };
}

export function principalGrantsInventoryMasterTabAccess(
  capabilityKeys: ReadonlySet<string>,
  tabId: InventoryMasterTabId,
): boolean {
  const tab = getInventoryMasterTabConfig(tabId);
  return principalGrantsInventoryMasterRouteAccess(
    capabilityKeys,
    tab.route,
    tab.catalogModuleSlug,
  );
}
