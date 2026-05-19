import { FD_SHELL_ACCESS } from '@/lib/runtime-capability-keys';
import type { ModuleManifest } from '../types';

export const frontdeskModuleManifest: ModuleManifest = {
  slug: 'frontdesk',
  name: 'Frontdesk',
  icon: 'concierge-bell',
  routePrefix: '/frontdesk',
  sortOrder: 30,
  requiredCapabilities: [FD_SHELL_ACCESS],
  requiredModulesAny: ['frontdesk', 'master-data', 'master_data'],
  navigation: [
    {
      id: 'frontdesk-visit-registration',
      label: 'Visit Registration',
      icon: 'clipboard-signature',
      route: '/frontdesk/visit-registration',
      requiredCapabilities: [FD_SHELL_ACCESS],
    },
    {
      id: 'frontdesk-opd-patients',
      label: 'OPD Patients',
      icon: 'users',
      route: '/frontdesk/opd-patients',
      requiredCapabilities: [FD_SHELL_ACCESS],
    },
    {
      id: 'frontdesk-past-visits',
      label: 'Past Visits',
      icon: 'calendar-days',
      route: '/frontdesk/past-visits',
      requiredCapabilities: [FD_SHELL_ACCESS],
    },
    {
      id: 'frontdesk-appointments',
      label: 'Appointments',
      icon: 'calendar-days',
      route: '/frontdesk/appointments',
      requiredCapabilities: [FD_SHELL_ACCESS],
    },
  ],
};
