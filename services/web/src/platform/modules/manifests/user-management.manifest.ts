import {
  UM_ROLE_READ,
  UM_ROLES_ADMIN_ANY,
  UM_USER_CREATE,
  UM_USER_READ,
} from '@/lib/runtime-capability-keys';
import type { ModuleManifest } from '../types';

export const userManagementModuleManifest: ModuleManifest = {
  slug: 'user-management',
  name: 'User Management',
  icon: 'users',
  routePrefix: '/user-management',
  sortOrder: 20,
  requiredCapabilities: [UM_USER_READ, UM_USER_CREATE, UM_ROLE_READ],
  navigation: [
    {
      id: 'user-management-users',
      label: 'Users',
      icon: 'users',
      route: '/user-management',
      search: { q: '' },
      requiredCapabilities: [UM_USER_READ, UM_USER_CREATE],
    },
    {
      id: 'user-management-roles',
      label: 'Roles',
      icon: 'shield-check',
      route: '/user-management/roles',
      requiredCapabilities: [...UM_ROLES_ADMIN_ANY],
    },
  ],
};
