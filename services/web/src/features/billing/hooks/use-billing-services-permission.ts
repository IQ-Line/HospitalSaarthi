import { usePermissionsStore, type PermissionsState } from '@/stores/permissions.store';

const BILLING = 'billing';
const SERVICES = 'services';

/** Route guard — aligns with sidebar (`billing` or `master-data` module access). */
export function canReadBillingServices(): boolean {
  const s = usePermissionsStore.getState();
  if (s.hasFeaturePermission(BILLING, SERVICES, 'read')) return true;
  return s.hasModuleAccess('master-data');
}

export function useBillingServicesPermission() {
  const canRead = usePermissionsStore(
    (s: PermissionsState) =>
      s.hasFeaturePermission(BILLING, SERVICES, 'read') || s.hasModuleAccess('master-data'),
  );
  const canWrite = usePermissionsStore((s: PermissionsState) =>
    s.hasFeaturePermission(BILLING, SERVICES, 'write'),
  );
  return { canRead, canWrite };
}
