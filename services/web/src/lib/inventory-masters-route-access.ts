import {
  catalogModuleSlugForInventoryMasterTab,
  principalGrantsInventoryMasterRouteAccess,
} from '@/features/inventory-masters/lib/inventory-masters-access';
import type { InventoryMasterTabId } from '@/features/inventory-masters/types';
import { getInventoryMasterTabConfig } from '@/features/inventory-masters/inventory-masters-nav-model';
import { requireCatalogRouteAccess } from '@/lib/require-catalog-route-access';

export function requireInventoryMasterTabAccess(tabId: InventoryMasterTabId) {
  const tab = getInventoryMasterTabConfig(tabId);
  return requireCatalogRouteAccess(tab.route, {
    catalogProductSlugs: ['master-data', 'inventory-master'],
    routePrefix: '/master-data/inventory-supply-masters',
    catalogModuleSlug: catalogModuleSlugForInventoryMasterTab(tabId),
  });
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
