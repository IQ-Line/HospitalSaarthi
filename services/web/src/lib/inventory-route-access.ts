import { requireCatalogRouteAccess } from '@/lib/require-catalog-route-access';
import { INVENTORY_CATALOG_PRODUCT_SLUGS, INVENTORY_ROUTE_PREFIX } from '@/features/inventory/lib/inventory-access';

export function requireInventoryRouteAccess(route: string) {
  return requireCatalogRouteAccess(route, {
    catalogProductSlugs: INVENTORY_CATALOG_PRODUCT_SLUGS,
    routePrefix: INVENTORY_ROUTE_PREFIX,
    catalogModuleSlug: 'inventory',
  });
}
