import { usePermissionsStore, type PermissionsState } from '@/stores/permissions.store';

const BILLING = 'billing';
const SERVICES = 'services';

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
