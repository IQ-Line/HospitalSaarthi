import type { ModuleManifest } from '../types';

export const ipdModuleManifest: ModuleManifest = {
  slug: 'ipd',
  name: 'In-Patient (IPD)',
  icon: 'building',
  routePrefix: '/ipd',
  sortOrder: 95,
  keepNavigationGroup: true,
  requiredModulesAny: ['frontdesk'],
  requiredRolesAny: ['frontdesk', 'receptionist'],
  navigation: [
    {
      id: 'ipd-admissions',
      label: 'Admissions',
      icon: 'clipboard-signature',
      route: '/ipd/admissions',
      catalogModuleSlug: 'registration',
    },
  ],
};
