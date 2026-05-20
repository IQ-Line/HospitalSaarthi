import { getRolesFromAccessToken, isSuperAdminRole } from '@/lib/access-token';
import { useAuthStore } from '@/stores/auth.store';
import { usePermissionsStore } from '@/stores/permissions.store';

const BILLING = 'billing';
const MASTER_DATA = 'master-data';
const SERVICES = 'services';

/**
 * Shell gating for billing tariff pages — aligns with sidebar where possible.
 * UM `GET /auth/permissions-map` currently only projects user-management; until billing
 * Cerbos checks are added there, authenticated users without an explicit deny may enter
 * (APIs remain authoritative).
 */
export function canReadBillingServices(): boolean {
  if (!useAuthStore.getState().isAuthenticated) return false;

  const roles = getRolesFromAccessToken(useAuthStore.getState().accessToken);
  if (isSuperAdminRole(roles)) return true;

  const s = usePermissionsStore.getState();
  if (s.hasFeaturePermission(BILLING, SERVICES, 'read')) return true;
  if (s.hasModuleAccess(BILLING) || s.hasModuleAccess(MASTER_DATA)) return true;

  // Map hydrated but billing/master-data not in Cerbos projection yet — allow shell UX.
  const mapHasBillingScope = BILLING in s.map || MASTER_DATA in s.map;
  return !mapHasBillingScope;
}
