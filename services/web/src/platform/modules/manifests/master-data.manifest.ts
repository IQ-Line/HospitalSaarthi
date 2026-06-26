import type { ModuleManifest } from '../types';

export const masterDataModuleManifest: ModuleManifest = {
  slug: 'master-data',
  name: 'Master Data',
  icon: 'database',
  routePrefix: '/master-data',
  sortOrder: 30,
  requiredModulesAny: ['master-data'],
  navigation: [
    {
      id: 'master-data-modules',
      label: 'Modules',
      icon: 'database',
      route: '/master-data/modules',
      catalogModuleSlug: 'modules',
      superAdminOnly: true,
    },
    {
      id: 'master-data-permissions',
      label: 'Permissions',
      icon: 'shield-check',
      route: '/master-data/permissions',
      catalogModuleSlug: 'permissions',
      superAdminOnly: true,
    },
    {
      id: 'master-data-module-permissions',
      label: 'Module Permissions',
      icon: 'link',
      route: '/master-data/module-permissions',
      catalogModuleSlug: 'permissions',
      superAdminOnly: true,
    },
    {
      id: 'master-data-departments',
      label: 'Departments',
      icon: 'building-2',
      route: '/master-data/departments',
      catalogModuleSlug: 'departments',
    },
    {
      id: 'master-data-inventory-supply-masters',
      label: 'Inventory & Supply Masters',
      icon: 'package',
      route: '/master-data/inventory-supply-masters/item-master',
      catalogModuleSlug: 'inventory-master',
    },
  ],
};
