import { principalGrantsCatalogRouteAccess } from '@/lib/catalog-route-access';
import {
  INVENTORY_MASTER_DEFAULT_ROUTE,
  INVENTORY_MASTER_TABS,
} from '@/features/inventory-masters/inventory-masters-nav-model';
import type { InventoryMasterTabId } from '@/features/inventory-masters/types';

export const INVENTORY_MASTER_CATALOG_PRODUCT_SLUGS = ['master-data', 'inventory-master'] as const;
export const INVENTORY_MASTER_ROUTE_PREFIX = '/master-data/inventory-supply-masters';

export function principalGrantsInventoryMasterRouteAccess(
  capabilityKeys: ReadonlySet<string>,
  route: string,
  catalogModuleSlug?: string,
): boolean {
  return principalGrantsCatalogRouteAccess(capabilityKeys, route, {
    catalogProductSlugs: INVENTORY_MASTER_CATALOG_PRODUCT_SLUGS,
    routePrefix: INVENTORY_MASTER_ROUTE_PREFIX,
    catalogModuleSlug,
  });
}

export function firstAccessibleInventoryMasterPath(
  capabilityKeys: ReadonlySet<string>,
): string | null {
  for (const tab of INVENTORY_MASTER_TABS) {
    if (principalGrantsInventoryMasterRouteAccess(capabilityKeys, tab.route, tab.catalogModuleSlug)) {
      return tab.route;
    }
  }
  return null;
}

export function defaultInventoryMasterLandingPath(): string {
  return INVENTORY_MASTER_DEFAULT_ROUTE;
}

export function catalogModuleSlugForInventoryMasterTab(tabId: InventoryMasterTabId): string {
  return INVENTORY_MASTER_TABS.find((tab) => tab.id === tabId)?.catalogModuleSlug ?? 'inventory-master';
}
