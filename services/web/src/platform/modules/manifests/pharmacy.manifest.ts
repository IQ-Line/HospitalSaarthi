import type { ModuleManifest } from '../types';

/** Pharmacy counter — dashboard, prescription queue, and dispense workspace. */
export const pharmacyModuleManifest: ModuleManifest = {
  slug: 'pharmacy',
  name: 'Pharmacy',
  icon: 'pill-bottle',
  routePrefix: '/pharmacy',
  tenantScoped: false,
  sortOrder: 35,
  navigation: [
    {
      id: 'pharmacy-dashboard',
      label: 'Dashboard',
      icon: 'layout-grid',
      route: '/pharmacy/dashboard',
    },
    {
      id: 'pharmacy-dispense',
      label: 'Dispense',
      icon: 'pill-bottle',
      route: '/pharmacy/dispense',
    },
    {
      id: 'pharmacy-queue',
      label: 'Queue',
      icon: 'calendar-clock',
      route: '/pharmacy/queue',
    },
    {
      id: 'pharmacy-stock',
      label: 'Stock',
      icon: 'package',
      route: '/pharmacy/stock',
    },
    {
      id: 'pharmacy-transfers',
      label: 'Transfers',
      icon: 'arrow-left-right',
      route: '/pharmacy/transfers',
    },
    {
      id: 'pharmacy-replenishment',
      label: 'Replenishment',
      icon: 'list-checks',
      route: '/pharmacy/replenishment',
    },
  ],
};
