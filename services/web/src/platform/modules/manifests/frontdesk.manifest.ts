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
      id: 'frontdesk-visit-registration',
      label: 'Visit Registration',
      icon: 'clipboard-signature',
      route: '/frontdesk/visit-registration',
    },
    {
      id: 'frontdesk-opd-patients',
      label: 'OPD Patients',
      icon: 'users',
      route: '/frontdesk/opd-patients',
    },
    {
      id: 'frontdesk-past-visits',
      label: 'Past Visits',
      icon: 'calendar-days',
      route: '/frontdesk/past-visits',
    },
    {
      id: 'frontdesk-appointments',
      label: 'Appointments',
      icon: 'calendar-days',
      route: '/frontdesk/appointments',
    },
  ],
};
