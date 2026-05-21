import type { ModuleManifest } from '../types';

export const dashboardModuleManifest: ModuleManifest = {
  slug: 'dashboard',
  name: 'Dashboard',
  icon: 'layout-grid',
  routePrefix: '/dashboard',
  tenantScoped: false,
  sortOrder: 0,
  navigation: [
    {
      id: 'dashboard',
      label: 'Dashboard',
      icon: 'layout-grid',
      route: '/dashboard',
    },
  ],
};
