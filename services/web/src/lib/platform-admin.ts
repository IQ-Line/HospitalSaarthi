import { parseAccessJwtClaims } from '@/lib/jwt-claims';

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
  const claims = parseAccessJwtClaims(accessToken);
  return isPlatformSuperAdmin(claims.roles);
}
