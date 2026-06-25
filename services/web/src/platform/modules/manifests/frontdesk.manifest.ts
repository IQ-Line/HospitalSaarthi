import type { ModuleManifest } from '../types';

export const frontdeskModuleManifest: ModuleManifest = {
  slug: 'frontdesk',
  name: 'Frontdesk',
  icon: 'concierge-bell',
  routePrefix: '/frontdesk',
  sortOrder: 100,
  requiredModulesAny: ['frontdesk'],
  requiredRolesAny: ['frontdesk', 'receptionist'],
  navigation: [
    {
      id: 'frontdesk-registration',
      label: 'OPD Registration',
      icon: 'clipboard-signature',
      route: '/frontdesk/opd-registration',
      catalogModuleSlug: 'registration',
    },
    {
      id: 'frontdesk-opd-patients',
      label: 'OPD Patients',
      icon: 'users',
      route: '/frontdesk/opd-patients',
      catalogModuleSlug: 'opd',
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
