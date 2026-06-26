import type { ModuleManifest } from '../types';

/** Operational inventory — stock, GRN, consumption, and store workflows. */
export const inventoryModuleManifest: ModuleManifest = {
  slug: 'inventory',
  name: 'Inventory',
  icon: 'package',
  routePrefix: '/inventory',
  sortOrder: 36,
  keepNavigationGroup: true,
  /** Until inventory L1 is in catalog, fall back to inventory-master for tenant admins. */
  requiredModulesAny: ['inventory', 'inventory-master'],
  navigation: [
    {
      id: 'inventory-dashboard',
      label: 'Dashboard',
      icon: 'layout-grid',
      route: '/inventory/dashboard',
      catalogModuleSlug: 'inventory',
    },
    {
      id: 'inventory-items',
      label: 'Items',
      icon: 'package',
      route: '/inventory/items',
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
      id: 'inventory-grn-logs',
      label: 'GRN logs',
      icon: 'file-text',
      route: '/inventory/grn-logs',
      catalogModuleSlug: 'inventory',
    },
    {
      id: 'inventory-consume',
      label: 'Consume',
      icon: 'arrow-down',
      route: '/inventory/consume',
      catalogModuleSlug: 'inventory',
    },
    {
      id: 'inventory-adjustments',
      label: 'Adjustments',
      icon: 'sliders-horizontal',
      route: '/inventory/adjustments',
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
      id: 'inventory-indents',
      label: 'Indents',
      icon: 'clipboard-list',
      route: '/inventory/indents',
      catalogModuleSlug: 'inventory',
    },
    {
      id: 'inventory-reorder',
      label: 'Reorder',
      icon: 'refresh-cw',
      route: '/inventory/reorder',
      catalogModuleSlug: 'inventory',
    },
    {
      id: 'inventory-physical-counts',
      label: 'Physical Counts',
      icon: 'list-checks',
      route: '/inventory/physical-counts',
      catalogModuleSlug: 'inventory',
    },
    {
      id: 'inventory-reports',
      label: 'Reports',
      icon: 'file-text',
      route: '/inventory/reports',
      catalogModuleSlug: 'inventory',
    },
    {
      id: 'inventory-suppliers',
      label: 'Suppliers',
      icon: 'building-2',
      route: '/inventory/suppliers',
      catalogModuleSlug: 'inventory',
    },
  ],
};
