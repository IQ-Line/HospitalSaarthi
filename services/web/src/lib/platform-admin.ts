import { getRolesFromAccessToken, getScopesFromAccessToken } from '@/lib/access-token';

/** The bounded platform authority scope. Presence => platform operator (UX gating only). */
export const PLATFORM_SCOPE = 'platform';

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

/**
 * UX gating only: bounded `scope:platform` claim (PRIMARY), OR the retained "super-admin" display
 * role (fallback). The operator token carries both; backend Cerbos PDP is authoritative regardless.
 */
export function isPlatformSuperAdminFromAccessToken(accessToken: string | null | undefined): boolean {
  return (
    getScopesFromAccessToken(accessToken).includes(PLATFORM_SCOPE) ||
    isPlatformSuperAdmin(getRolesFromAccessToken(accessToken))
  );
}

/**
 * UX-only platform-operator resolution. Authority is the bounded `scope:platform` claim — read from
 * the enriched principal scopes (`GET /auth/principal.attributes.scopes`) and the JWT `scopes`
 * claim as the PRIMARY signal. The "super-admin" display role (still assigned to the operator) is
 * retained as a UX fallback so existing call sites keep working without churn. Backend Cerbos PDP
 * remains authoritative — this never gates data access.
 */
export function resolvePlatformSuperAdmin(input: {
  principalScopes?: readonly string[];
  principalRoles?: readonly string[];
  authRoles?: readonly string[];
  accessToken?: string | null;
}): boolean {
  return (
    (input.principalScopes?.includes(PLATFORM_SCOPE) ?? false) ||
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
