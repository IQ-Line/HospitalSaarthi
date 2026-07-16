import type { ModuleManifest } from '../types';

/** Tenant-admin catalog for inventory reference masters (categories, UOM, HSN/GST, …). */
export const inventorySupplyMastersModuleManifest: ModuleManifest = {
  slug: 'inventory-supply-masters',
  name: 'Inventory & Supply Masters',
  icon: 'package',
  routePrefix: '/inventory-supply-masters',
  sortOrder: 31,
  requiredModulesAny: ['inventory-master'],
  /** Superadmin: after facility selection; tenant-admin/admin: home facility. */
  requiredRolesAny: ['super-admin', 'tenant-admin', 'admin'],
  navigation: [
    {
      id: 'inventory-supply-masters',
      label: 'Inventory & Supply Masters',
      icon: 'package',
      route: '/inventory-supply-masters',
      catalogModuleSlug: 'inventory-master',
      tenantAdminOnly: true,
    },
  ],
};
