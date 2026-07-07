import type { ModuleManifest } from '../types';

export const frontdeskModuleManifest: ModuleManifest = {
  slug: 'frontdesk',
  name: 'Frontdesk',
  icon: 'concierge-bell',
  routePrefix: '/frontdesk',
  sortOrder: 100,
  requiredModulesAny: ['frontdesk'],
  requiredRolesAny: ['frontdesk', 'receptionist'],
  keepNavigationGroup: true,
  navigation: [
    {
      id: 'frontdesk-registration',
      label: 'OPD Registration',
      icon: 'clipboard-signature',
      route: '/frontdesk/opd-registration',
      catalogModuleSlug: 'registration',
    },
  ],
};
