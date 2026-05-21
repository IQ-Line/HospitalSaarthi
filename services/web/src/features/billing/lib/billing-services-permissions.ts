import { getRolesFromAccessToken, isSuperAdminRole } from '@/lib/access-token';
import {
  BILLING_SHELL_ACCESS,
  BILLING_TARIFF_READ,
} from '@/lib/runtime-capability-keys';
import type { PermissionsState } from '@/stores/permissions.store';

type Args = {
  isAuthenticated: boolean;
  accessToken: string | null;
  permissions: Pick<PermissionsState, 'hasCapability' | 'hasAnyCapability'>;
};

function shellAllowed({ isAuthenticated, accessToken }: Args): boolean {
  return isAuthenticated && isSuperAdminRole(getRolesFromAccessToken(accessToken));
}

export function canReadBillingServices(args: Args): boolean {
  if (shellAllowed(args)) {
    return true;
  }
  const s = args.permissions;
  return s.hasAnyCapability([
    BILLING_TARIFF_READ,
    BILLING_SHELL_ACCESS,
    'tariff-master:tariff-master:create',
    'tariff-master:tariff-master:update',
  ]);
}

export function canWriteBillingServices(args: Args): boolean {
  if (shellAllowed(args)) {
    return true;
  }
  const s = args.permissions;
  return s.hasAnyCapability([
    'tariff-master:tariff-master:create',
    'tariff-master:tariff-master:update',
    'tariff-master:tariff-master:delete',
    BILLING_SHELL_ACCESS,
  ]);
}
