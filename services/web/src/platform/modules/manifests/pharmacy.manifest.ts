import type { ModuleManifest } from '../types';

/** Pharmacy counter — OPD completed prescription queue and dispense billing. */
export const pharmacyModuleManifest: ModuleManifest = {
  slug: 'pharmacy',
  name: 'Pharmacy',
  icon: 'pill-bottle',
  routePrefix: '/pharmacy',
  sortOrder: 35,
  requiredModulesAny: ['pharmacy', 'opd'],
  navigation: [
    {
      id: 'pharmacy-queue',
      label: 'Prescription Queue',
      icon: 'pill-bottle',
      route: '/pharmacy/queue',
      catalogModuleSlug: 'dispense',
      requiredCapabilities: ['dispense:dispense:read'],
    },
  ],
};
