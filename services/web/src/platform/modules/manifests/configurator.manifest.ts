import type { ModuleManifest } from '../types';

export const configuratorModuleManifest: ModuleManifest = {
  slug: 'configurator',
  name: 'Configurator',
  icon: 'sliders-horizontal',
  routePrefix: '/configurator',
  sortOrder: 10,
  requiredModulesAny: ['configurator'],
  navigation: [
    {
      id: 'configurator-tenant',
      label: 'Tenant',
      icon: 'building',
      route: '/configurator/tenant',
      catalogModuleSlug: 'tenant-modules',
    },
  ],
};
