import { usePermissionsStore } from '@/stores/permissions.store';

const BILLING = 'billing';
const SERVICES = 'services';

/**
 * Route guard — aligns with sidebar (`billing.services` read or `master-data` module).
 * Temporary master-data fallback until billing has its own Cerbos module in production.
 * Tracking: remove when HIMS billing Cerbos policies ship (see permissions-map `billing.services`).
 */
export function canReadBillingServices(): boolean {
  const s = usePermissionsStore.getState();
  if (s.hasFeaturePermission(BILLING, SERVICES, 'read')) return true;
  return s.hasModuleAccess('master-data');
}
