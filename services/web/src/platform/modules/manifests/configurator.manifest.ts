import { CFG_SHELL_ACCESS } from '@/lib/runtime-capability-keys';
import type { ModuleManifest } from '../types';

export const configuratorModuleManifest: ModuleManifest = {
  slug: 'configurator',
  name: 'Configurator',
  icon: 'sliders-horizontal',
  routePrefix: '/configurator',
  sortOrder: 50,
  requiredCapabilities: [CFG_SHELL_ACCESS],
  requiredModulesAny: ['configurator'],
  navigation: [
    {
      id: 'configurator-tenant',
      label: 'Tenant',
      icon: 'building',
      route: '/configurator/tenant',
      requiredCapabilities: [CFG_SHELL_ACCESS],
    },
  ],
};
