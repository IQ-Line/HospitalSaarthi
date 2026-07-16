import type { ModuleManifest } from '../types';

/** Tenant-admin operational store configuration (inventory stores). */
export const storeConfigurationModuleManifest: ModuleManifest = {
  slug: 'store-configuration',
  name: 'Store Configuration',
  icon: 'warehouse',
  routePrefix: '/store-configuration',
  sortOrder: 32,
  requiredModulesAny: ['store-config'],
  /** Superadmin: after facility selection; tenant-admin: home facility. */
  requiredRolesAny: ['super-admin', 'tenant-admin'],
  navigation: [
    {
      id: 'store-configuration',
      label: 'Store Configuration',
      icon: 'warehouse',
      route: '/store-configuration',
      catalogModuleSlug: 'store-config',
      tenantAdminOnly: true,
    },
  ],
};
