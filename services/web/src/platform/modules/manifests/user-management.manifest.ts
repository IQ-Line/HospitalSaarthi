import type { ModuleManifest } from '../types';

export const userManagementModuleManifest: ModuleManifest = {
  slug: 'user-management',
  name: 'User Management',
  icon: 'users',
  routePrefix: '/user-management',
  sortOrder: 0,
  requiredModulesAny: ['user-management'],
  navigation: [
    {
      id: 'user-management-users',
      label: 'Users',
      icon: 'users',
      route: '/user-management',
      search: { q: '' },
      catalogModuleSlug: 'users',
    },
    {
      id: 'user-management-roles',
      label: 'Roles',
      icon: 'shield-check',
      route: '/user-management/roles',
      catalogModuleSlug: 'user-roles',
    },
  ],
};
