import {
  canReadBillingServices,
  canWriteBillingServices,
} from '@/features/billing/lib/billing-services-permissions';
import { useAuthStore } from '@/stores/auth.store';
import { usePermissionsStore } from '@/stores/permissions.store';
import { useShallow } from 'zustand/react/shallow';

export function useBillingServicesPermission() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const accessToken = useAuthStore((s) => s.accessToken);
  const permissions = usePermissionsStore(
    useShallow((s) => ({
      hasFeaturePermission: s.hasFeaturePermission,
      hasModuleAccess: s.hasModuleAccess,
      map: s.map,
    })),
  );
  const args = { isAuthenticated, accessToken, permissions };
  return {
    canRead: canReadBillingServices(args),
    canWrite: canWriteBillingServices(args),
  };
}
