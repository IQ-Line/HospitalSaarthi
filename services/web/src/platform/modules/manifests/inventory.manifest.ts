import type { ModuleManifest } from '../types';

/** Operational inventory — stock, GRN, consumption, and store workflows. */
export const inventoryModuleManifest: ModuleManifest = {
  slug: 'inventory',
  name: 'Inventory',
  icon: 'package',
  routePrefix: '/inventory',
  tenantScoped: false,
  sortOrder: 36,
  keepNavigationGroup: true,
  navigation: [
    {
      id: 'inventory-dashboard',
      label: 'Dashboard',
      icon: 'layout-grid',
      route: '/inventory/dashboard',
      catalogModuleSlug: 'inventory',
    },
    {
      id: 'inventory-stock',
      label: 'Stock',
      icon: 'layers',
      route: '/inventory/stock',
      catalogModuleSlug: 'inventory-stock',
    },
    {
      id: 'inventory-indents',
      label: 'Indents',
      icon: 'clipboard-list',
      route: '/inventory/indents',
      catalogModuleSlug: 'inventory-indents',
    },
    {
      id: 'inventory-transfers',
      label: 'Transfers',
      icon: 'arrow-right-left',
      route: '/inventory/transfers',
      catalogModuleSlug: 'inventory-transfers',
    },
    {
      id: 'inventory-grn-logs',
      label: 'GRN logs',
      icon: 'file-text',
      route: '/inventory/grn-logs',
      catalogModuleSlug: 'inventory-grn',
    },
  ],
};
