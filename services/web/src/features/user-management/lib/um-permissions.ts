import type { PermissionsState } from '@/stores/permissions.store';

export const UM_MODULE = 'user-management' as const;

export function canReadUsers(s: Pick<PermissionsState, 'hasFeaturePermission'>): boolean {
  return s.hasFeaturePermission(UM_MODULE, 'users', 'read');
}

export function canWriteUsers(s: Pick<PermissionsState, 'hasFeaturePermission'>): boolean {
  return s.hasFeaturePermission(UM_MODULE, 'users', 'write');
}

export function canReadRoles(s: Pick<PermissionsState, 'hasFeaturePermission'>): boolean {
  return s.hasFeaturePermission(UM_MODULE, 'roles', 'read');
}

/** Users tab: list and/or create — not the full directory without read. */
export function canAccessUsersSection(s: Pick<PermissionsState, 'hasFeaturePermission'>): boolean {
  return canReadUsers(s) || canWriteUsers(s);
}

/** Default landing route when opening User Management from the sidebar. */
export function userManagementSidebarTarget(s: Pick<PermissionsState, 'hasFeaturePermission'>): {
  to: '/user-management' | '/user-management/roles';
  search?: { q: string; createUser?: boolean };
} {
  if (canAccessUsersSection(s)) {
    return { to: '/user-management', search: { q: '' } };
  }
  if (canReadRoles(s)) {
    return { to: '/user-management/roles' };
  }
  return { to: '/user-management', search: { q: '' } };
}
