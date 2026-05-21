import { getRolesFromAccessToken } from '@/lib/access-token';

/** Canonical role code for platform operators (matches dev seed `super-admin`). */
export const PLATFORM_SUPER_ADMIN_ROLE = 'super-admin';

export function isPlatformSuperAdminRole(role: string): boolean {
  return role.trim().toLowerCase() === PLATFORM_SUPER_ADMIN_ROLE;
}

export function isPlatformSuperAdmin(roles: readonly string[] | undefined): boolean {
  if (roles == null || roles.length === 0) {
    return false;
  }
  return roles.some(isPlatformSuperAdminRole);
}

export function isPlatformSuperAdminFromAccessToken(accessToken: string | null | undefined): boolean {
  return isPlatformSuperAdmin(getRolesFromAccessToken(accessToken));
}

/** UX-only: principal roles, persisted auth roles, and JWT role claims. */
export function resolvePlatformSuperAdmin(input: {
  principalRoles?: readonly string[];
  authRoles?: readonly string[];
  accessToken?: string | null;
}): boolean {
  return (
    isPlatformSuperAdmin(input.principalRoles) ||
    isPlatformSuperAdmin(input.authRoles) ||
    isPlatformSuperAdminFromAccessToken(input.accessToken)
  );
}
