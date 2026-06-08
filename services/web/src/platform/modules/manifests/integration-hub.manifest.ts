import type { ModuleManifest } from '../types';

export const integrationHubModuleManifest: ModuleManifest = {
  slug: 'integration-hub',
  name: 'Integration Hub',
  icon: 'link',
  routePrefix: '/integration-hub',
  sortOrder: 25,
  requiredModulesAny: ['integration'],
  navigation: [
    {
      id: 'integration-hub-integrations',
      label: 'Integrations',
      icon: 'link',
      route: '/integration-hub',
      catalogModuleSlug: 'integration',
    },
  ],
};
