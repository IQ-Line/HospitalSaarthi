import type { ModuleManifest } from '../types';

/** Tenant-admin catalog for inventory reference masters (categories, UOM, HSN/GST, …). */
export const inventorySupplyMastersModuleManifest: ModuleManifest = {
  slug: 'inventory-master',
  name: 'Inventory & Supply Masters',
  icon: 'package',
  routePrefix: '/inventory-supply-masters',
  sortOrder: 31,
  requiredModulesAny: ['inventory-master'],
  requiredRolesAny: ['tenant-admin'],
  navigation: [
    {
      id: 'inventory-supply-masters',
      label: 'Inventory & Supply Masters',
      icon: 'package',
      route: '/inventory-supply-masters/item-master',
      catalogModuleSlug: 'inventory-master',
      tenantAdminOnly: true,
    },
  ],
};
