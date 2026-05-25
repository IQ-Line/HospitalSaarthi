import type { ModuleManifest } from '../types';

export const frontdeskModuleManifest: ModuleManifest = {
  slug: 'frontdesk',
  name: 'Frontdesk',
  icon: 'concierge-bell',
  routePrefix: '/frontdesk',
  sortOrder: 30,
  requiredModulesAny: ['frontdesk'],
  navigation: [
    {
      id: 'frontdesk-registration',
      label: 'Registration',
      icon: 'clipboard-signature',
      route: '/frontdesk/visit-registration',
      catalogModuleSlug: 'registration',
    },
    {
      id: 'frontdesk-past-visits',
      label: 'Past Visits',
      icon: 'calendar-days',
      route: '/frontdesk/past-visits',
      catalogModuleSlug: 'opd',
    },
    {
      id: 'frontdesk-appointments',
      label: 'Appointments',
      icon: 'calendar-days',
      route: '/frontdesk/appointments',
      catalogModuleSlug: 'opd',
    },
  ],
};
