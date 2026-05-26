import type { ModuleManifest } from '../types';

export const smartParchaModuleManifest: ModuleManifest = {
  slug: 'smart-parcha',
  name: 'Smart Parcha',
  icon: 'pen-line',
  routePrefix: '/opd',
  sortOrder: 35,
  requiredModulesAny: ['opd'],
  /** Deep-link only: `/opd/consultation/$visitId` from OPD queue (no sidebar leaf without visit id). */
  navigation: [],
};
