import { requireCatalogRouteAccess } from '@/lib/require-catalog-route-access';
import {
  INVENTORY_CATALOG_PRODUCT_SLUGS,
  INVENTORY_ROUTE_PREFIX,
  resolveInventoryCatalogModuleSlug,
} from '@/features/inventory/lib/inventory-access';

/** Phase 0 — open all operational inventory routes until Cerbos/tenant gates are wired. */
export const INVENTORY_PHASE0_OPEN_ACCESS = true;

export function requireInventoryRouteAccess(route: string) {
  if (INVENTORY_PHASE0_OPEN_ACCESS) {
    return () => undefined;
  }
  return requireCatalogRouteAccess(route, {
    catalogProductSlugs: INVENTORY_CATALOG_PRODUCT_SLUGS,
    routePrefix: INVENTORY_ROUTE_PREFIX,
    catalogModuleSlug: resolveInventoryCatalogModuleSlug(route),
  });
}
