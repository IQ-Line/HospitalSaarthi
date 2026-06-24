import { CFG_SHELL_ACCESS } from '@/lib/runtime-capability-keys';
import type { ModuleManifest } from '../types';

export const analyticsModuleManifest: ModuleManifest = {
  slug: 'analytics',
  name: 'Analytics',
  icon: 'bar-chart-3',
  routePrefix: '/analytics',
  tenantScoped: false,
  sortOrder: 45,
  requiredRolesAny: ['tenant-admin', 'super-admin'],
  requiredCapabilities: [CFG_SHELL_ACCESS],
  navigation: [
    {
      id: 'analytics-opd-registration-billing',
      label: 'OPD registration & billing',
      icon: 'file-spreadsheet',
      route: '/analytics/opd-registration-billing',
    },
  ],
};
