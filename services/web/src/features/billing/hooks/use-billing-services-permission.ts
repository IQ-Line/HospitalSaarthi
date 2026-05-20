import { canReadBillingServices } from '@/features/billing/lib/can-read-billing-services';
import { usePermissionsStore, type PermissionsState } from '@/stores/permissions.store';

const BILLING = 'billing';
const SERVICES = 'services';

export function useBillingServicesPermission() {
  const canRead = usePermissionsStore(() => canReadBillingServices());
  const canWrite = usePermissionsStore((s: PermissionsState) =>
    s.hasFeaturePermission(BILLING, SERVICES, 'write'),
  );
  return { canRead, canWrite };
}
