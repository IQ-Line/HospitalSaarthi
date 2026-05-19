import { MD_SHELL_ACCESS } from '@/lib/runtime-capability-keys';
import type { ModuleManifest } from '../types';

export const masterDataModuleManifest: ModuleManifest = {
  slug: 'master-data',
  name: 'Master Data',
  icon: 'database',
  routePrefix: '/master-data',
  sortOrder: 10,
  requiredCapabilities: [MD_SHELL_ACCESS],
  navigation: [
    {
      id: 'master-data-modules',
      label: 'Modules',
      icon: 'database',
      route: '/master-data/modules',
      requiredCapabilities: [MD_SHELL_ACCESS],
    },
    {
      id: 'master-data-permissions',
      label: 'Permissions',
      icon: 'shield-check',
      route: '/master-data/permissions',
      requiredCapabilities: [MD_SHELL_ACCESS],
    },
    {
      id: 'master-data-system-roles',
      label: 'System Roles',
      icon: 'users',
      route: '/master-data/system-roles',
      requiredCapabilities: [MD_SHELL_ACCESS],
    },
    {
      id: 'master-data-module-permissions',
      label: 'Module Permissions',
      icon: 'link',
      route: '/master-data/module-permissions',
      requiredCapabilities: [MD_SHELL_ACCESS],
    },
  ],
};
