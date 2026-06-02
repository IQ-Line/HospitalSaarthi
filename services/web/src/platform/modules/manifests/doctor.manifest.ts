import type { ModuleManifest } from '../types';

/** Doctor workstation — OPD patient queue at `/patients`. */
export const doctorModuleManifest: ModuleManifest = {
  slug: 'doctor',
  name: 'Doctor',
  icon: 'stethoscope',
  routePrefix: '/patients',
  sortOrder: 25,
  requiredModulesAny: ['frontdesk', 'opd'],
  requiredRolesAny: ['doctor'],
  keepNavigationGroup: true,
  navigation: [
    {
      id: 'doctor-patients',
      label: 'Patients',
      icon: 'users',
      route: '/patients',
      catalogModuleSlug: 'opd',
    },
  ],
};
