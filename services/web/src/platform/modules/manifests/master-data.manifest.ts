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
    },
    {
      id: 'master-data-permissions',
      label: 'Permissions',
      icon: 'shield-check',
      route: '/master-data/permissions',
    },
    {
      id: 'master-data-module-permissions',
      label: 'Module Permissions',
      icon: 'link',
      route: '/master-data/module-permissions',
      catalogModuleSlug: 'permissions',
    },
  ],
};
