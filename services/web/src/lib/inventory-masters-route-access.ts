import {
  assertInventorySupplyMastersTenantAdmin,
  catalogModuleSlugForInventoryMasterTab,
  isInventorySupplyMastersTenantAdminPrincipal,
  principalGrantsInventoryMasterRouteAccess,
} from '@/features/inventory-masters/lib/inventory-masters-access';
import type { InventoryMasterTabId } from '@/features/inventory-masters/types';
import { getInventoryMasterTabConfig } from '@/features/inventory-masters/inventory-masters-nav-model';
import { principalHasAnyInventoryMasterL3RouteAccess } from '@/lib/inventory-catalog-slugs';
import { requireCatalogRouteAccess } from '@/lib/require-catalog-route-access';

export function requireInventoryMasterTabAccess(tabId: InventoryMasterTabId) {
  return () => {
    assertInventorySupplyMastersTenantAdmin();
    if (isInventorySupplyMastersTenantAdminPrincipal()) {
      return;
    }
    const tab = getInventoryMasterTabConfig(tabId);
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

  /**
   * Item Master is the primary inventory-masters tab but has no dedicated L3 catalog module.
   * Show it when the principal can access the L2 shell or any reference-master L3 leaf.
   */
  if (tabId === 'item-master') {
    if (
      principalGrantsInventoryMasterRouteAccess(
        capabilityKeys,
        tab.route,
        tab.catalogModuleSlug,
      )
    ) {
      return true;
    }
    return principalHasAnyInventoryMasterL3RouteAccess(capabilityKeys);
  }

  return principalGrantsInventoryMasterRouteAccess(
    capabilityKeys,
    tab.route,
    tab.catalogModuleSlug,
  );
}
