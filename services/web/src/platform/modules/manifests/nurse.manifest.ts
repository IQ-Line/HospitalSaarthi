import type { ModuleManifest } from '../types';

/** Nurse workstation — OPD vitals and pre-consult documentation. */
export const nurseModuleManifest: ModuleManifest = {
  slug: 'nurse',
  name: 'Nurse',
  icon: 'heart-pulse',
  routePrefix: '/nurse',
  sortOrder: 30,
  requiredModulesAny: ['frontdesk', 'opd'],
  navigation: [
    {
      id: 'nurse-patients',
      label: 'Patients',
      icon: 'users',
      route: '/nurse/patients',
      catalogModuleSlug: 'opd',
    },
  ],
};
