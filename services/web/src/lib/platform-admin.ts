import { getRolesFromAccessToken } from '@/lib/access-token';

/** Canonical role code for platform operators (matches dev seed `super-admin`). */
export const PLATFORM_SUPER_ADMIN_ROLE = 'super-admin';

/** Canonical role code for tenant administrators (matches provisioning seed `tenant-admin`). */
export const TENANT_ADMIN_ROLE = 'tenant-admin';

/**
 * Role codes that grant tenant-administrator UX (sidebar enrichment, inventory masters, …).
 * Includes configurator-provisioned `tenant-admin` and UM roles typed as Administrator (`admin`).
 */
export const TENANT_ADMINISTRATOR_ROLE_CODES = [
  TENANT_ADMIN_ROLE,
  'admin',
  'tenant_admin',
  'administrator',
] as const;

const TENANT_ADMINISTRATOR_ROLE_CODE_SET = new Set<string>(
  TENANT_ADMINISTRATOR_ROLE_CODES.map((code) => code.toLowerCase()),
);

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

export function isTenantAdminRole(role: string): boolean {
  const normalized = role.trim().toLowerCase();
  return normalized.length > 0 && TENANT_ADMINISTRATOR_ROLE_CODE_SET.has(normalized);
}

export function isTenantAdmin(roles: readonly string[] | undefined): boolean {
  if (roles == null || roles.length === 0) {
    return false;
  }
  return roles.some(isTenantAdminRole);
}

export function isTenantAdminFromAccessToken(accessToken: string | null | undefined): boolean {
  return isTenantAdmin(getRolesFromAccessToken(accessToken));
}

export function resolveTenantAdmin(input: {
  principalRoles?: readonly string[];
  authRoles?: readonly string[];
  accessToken?: string | null;
}): boolean {
  return (
    isTenantAdmin(input.principalRoles) ||
    isTenantAdmin(input.authRoles) ||
    isTenantAdminFromAccessToken(input.accessToken)
  );
}
