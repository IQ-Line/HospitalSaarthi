export const INVENTORY_CATALOG_PRODUCT_SLUGS = ['inventory'] as const;
export const INVENTORY_ROUTE_PREFIX = '/inventory';

export const INVENTORY_DEFAULT_ROUTE = '/inventory/dashboard';

/** Master Data L2 catalog slug per operational inventory route. */
export const INVENTORY_ROUTE_CATALOG_MODULE_SLUG: Readonly<Record<string, string>> = {
  '/inventory/dashboard': 'inventory',
  '/inventory/stock': 'inventory-stock',
  '/inventory/indents': 'inventory-indents',
  '/inventory/transfers': 'inventory-transfers',
  '/inventory/grn-logs': 'inventory-grn',
};

export function resolveInventoryCatalogModuleSlug(route: string): string {
  return INVENTORY_ROUTE_CATALOG_MODULE_SLUG[route] ?? 'inventory';
}
