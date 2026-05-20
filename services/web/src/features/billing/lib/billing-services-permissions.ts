import { getRolesFromAccessToken, isSuperAdminRole } from '@/lib/access-token';
import type { PermissionsState } from '@/stores/permissions.store';

const BILLING = 'billing';
const MASTER_DATA = 'master-data';
const SERVICES = 'services';

type Args = {
  isAuthenticated: boolean;
  accessToken: string | null;
  permissions: Pick<PermissionsState, 'hasFeaturePermission' | 'hasModuleAccess' | 'map'>;
};

function shellAllowed({ isAuthenticated, accessToken }: Args): boolean {
  return isAuthenticated && isSuperAdminRole(getRolesFromAccessToken(accessToken));
}

export function canReadBillingServices(args: Args): boolean {
  if (shellAllowed(args)) return true;
  const s = args.permissions;
  if (s.hasFeaturePermission(BILLING, SERVICES, 'read')) return true;
  if (s.hasModuleAccess(BILLING) || s.hasModuleAccess(MASTER_DATA)) return true;
  return !(BILLING in s.map || MASTER_DATA in s.map);
}

export function canWriteBillingServices(args: Args): boolean {
  if (shellAllowed(args)) return true;
  const s = args.permissions;
  if (s.hasFeaturePermission(BILLING, SERVICES, 'write')) return true;
  if (s.hasModuleAccess(BILLING) || s.hasModuleAccess(MASTER_DATA)) return true;
  return !(BILLING in s.map || MASTER_DATA in s.map);
}
