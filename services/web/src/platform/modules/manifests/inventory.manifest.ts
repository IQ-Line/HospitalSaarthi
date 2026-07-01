import type { ModuleManifest } from '../types';

/** Operational inventory — stock, GRN, consumption, and store workflows. */
export const inventoryModuleManifest: ModuleManifest = {
  slug: 'inventory',
  name: 'Inventory',
  icon: 'package',
  routePrefix: '/inventory',
  sortOrder: 36,
  keepNavigationGroup: true,
  /** Until inventory L1 is in catalog, master-data L1 and inventory-master L2 both gate access. */
  requiredModulesAny: ['inventory', 'inventory-master', 'master-data'],
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
      catalogModuleSlug: 'inventory',
    },
    {
      id: 'inventory-indents',
      label: 'Indents',
      icon: 'clipboard-list',
      route: '/inventory/indents',
      catalogModuleSlug: 'inventory',
    },
    {
      id: 'inventory-transfers',
      label: 'Transfers',
      icon: 'arrow-right-left',
      route: '/inventory/transfers',
      catalogModuleSlug: 'inventory',
    },
    {
      id: 'inventory-grn-logs',
      label: 'GRN logs',
      icon: 'file-text',
      route: '/inventory/grn-logs',
      catalogModuleSlug: 'inventory',
    },
  ],
};
