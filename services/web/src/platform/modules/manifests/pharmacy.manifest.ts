import type { ModuleManifest } from '../types';
import { PHARMACY_DISPENSE_ACCESS_ANY } from '@/lib/runtime-capability-keys';

/** Pharmacy counter — OPD prescription queue, walk-in dispense, and billing. */
export const pharmacyModuleManifest: ModuleManifest = {
  slug: 'pharmacy',
  name: 'Pharmacy',
  icon: 'pill-bottle',
  routePrefix: '/pharmacy',
  sortOrder: 35,
  requiredModulesAny: ['pharmacy'],
  requiredRolesAny: ['pharmacist'],
  navigation: [
    {
      id: 'pharmacy-queue',
      label: 'Prescription Queue',
      icon: 'pill-bottle',
      route: '/pharmacy/queue',
      catalogModuleSlug: 'dispense',
      requiredCapabilities: [...PHARMACY_DISPENSE_ACCESS_ANY],
    },
  ],
};
