import type { ModuleManifest } from '../types';

/** Top-level Patients entry (reference HIMS sidebar — not under Frontdesk group). */
export const patientsModuleManifest: ModuleManifest = {
  slug: 'patients',
  name: 'Patients',
  icon: 'users',
  routePrefix: '/patients',
  sortOrder: 25,
  /** Tenant gate only — label stays "Patients" (see apply-catalog-navigation-labels). */
  requiredModulesAny: ['frontdesk', 'opd'],
  navigation: [
    {
      id: 'patients-opd-list',
      label: 'Patients',
      icon: 'users',
      route: '/patients',
      catalogModuleSlug: 'opd',
    },
  ],
};
