import { isPlatformSuperAdminFromAccessToken } from '@/lib/platform-admin';
import type { PermissionsState } from '@/stores/permissions.store';
import { useAuthStore } from '@/stores/auth.store';

export const UM_MODULE = 'user-management' as const;

type UmPermissionState = Pick<PermissionsState, 'hasFeaturePermission' | 'map'>;

function roleActionAllowed(
  s: UmPermissionState,
  action: 'read' | 'create' | 'update' | 'delete',
): boolean {
  return s.hasFeaturePermission(UM_MODULE, 'roles', action);
}

export function canReadUsers(s: Pick<PermissionsState, 'hasFeaturePermission'>): boolean {
  return s.hasFeaturePermission(UM_MODULE, 'users', 'read');
}

export function canWriteUsers(s: Pick<PermissionsState, 'hasFeaturePermission'>): boolean {
  return s.hasFeaturePermission(UM_MODULE, 'users', 'write');
}

export function canReadRoles(s: Pick<PermissionsState, 'hasFeaturePermission'>): boolean {
  return roleActionAllowed(s, 'read');
}

export function canCreateRoles(s: UmPermissionState): boolean {
  return roleActionAllowed(s, 'create');
}

export function canUpdateRoles(s: UmPermissionState): boolean {
  return roleActionAllowed(s, 'update');
}

export function canDeleteRoles(s: UmPermissionState): boolean {
  if (roleActionAllowed(s, 'delete')) {
    return true;
  }
  // Cerbos PDP: `role.delete` is allowed for principals with um:role:update (same rule block).
  return canUpdateRoles(s);
}

/** GET /roles/:id/capabilities — requires role.read, not capability.read. */
export function canReadRoleCapabilities(s: Pick<PermissionsState, 'hasFeaturePermission'>): boolean {
  return canReadRoles(s);
}

/** Any role-template mutation (create, update, or delete). */
export function canWriteRoles(s: UmPermissionState): boolean {
  return canCreateRoles(s) || canUpdateRoles(s) || canDeleteRoles(s);
}

/** Roles admin screen (list / create / edit templates) — never inferred from coarse `roles.write`. */
export function canAccessRolesAdmin(s: UmPermissionState): boolean {
  return canReadRoles(s) || canWriteRoles(s);
}

export function canManageUserAccess(s: Pick<PermissionsState, 'hasFeaturePermission'>): boolean {
  return s.hasFeaturePermission(UM_MODULE, 'userAccess', 'write');
}

/** See roles / permissions on a user profile (not the Roles admin tab). */
export function canViewUserRoleAccess(s: Pick<PermissionsState, 'hasFeaturePermission'>): boolean {
  return (
    s.hasFeaturePermission(UM_MODULE, 'userAccess', 'read') === true ||
    canManageUserAccess(s)
  );
}

export function canReadCapabilities(s: Pick<PermissionsState, 'hasFeaturePermission'>): boolean {
  return s.hasFeaturePermission(UM_MODULE, 'capabilities', 'read');
}

/** Users tab: list and/or create — not the full directory without read. */
export function canAccessUsersSection(s: Pick<PermissionsState, 'hasFeaturePermission'>): boolean {
  return canReadUsers(s) || canWriteUsers(s);
}

/** Default landing route when opening User Management from the sidebar. */
/** Platform super-admin may pick target tenant when creating users. */
export function canSelectTenantOnUserCreate(): boolean {
  return isPlatformSuperAdminFromAccessToken(useAuthStore.getState().accessToken);
}

export function userManagementSidebarTarget(s: Pick<PermissionsState, 'hasFeaturePermission'>): {
  to: '/user-management' | '/user-management/roles';
  search?: { q: string; createUser?: boolean };
} {
  if (canAccessUsersSection(s)) {
    return { to: '/user-management', search: { q: '' } };
  }
  if (canAccessRolesAdmin(s)) {
    return { to: '/user-management/roles' };
  }
  return { to: '/user-management', search: { q: '' } };
}
