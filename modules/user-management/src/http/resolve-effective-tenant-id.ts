import type { FastifyRequest } from "fastify";

export const PLATFORM_SUPER_ADMIN_ROLE = "super-admin";

function pickNonEmptyString(value: unknown): string | undefined {
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

function resolveJwtTenantId(user: unknown): string {
  return (user as { tenantId: string }).tenantId;
}

function resolveJwtRoles(user: unknown): string[] {
  if (user == null || typeof user !== "object") {
    return [];
  }
  const roles = (user as { roles?: unknown }).roles;
  if (!Array.isArray(roles)) {
    return [];
  }
  return roles.filter((r): r is string => typeof r === "string");
}

export function isPlatformSuperAdminRole(role: string): boolean {
  return role.trim().toLowerCase() === PLATFORM_SUPER_ADMIN_ROLE;
}

export function isPlatformSuperAdminPrincipal(user: unknown): boolean {
  return resolveJwtRoles(user).some(isPlatformSuperAdminRole);
}

function pickHeaderTenantId(request: FastifyRequest): string | undefined {
  const raw = request.headers["iq_tenant_id"];
  if (typeof raw !== "string") {
    return undefined;
  }
  const trimmed = raw.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

/**
 * JWT home tenant for identity / principal enrichment (always the signed-in user's row).
 */
export function resolveJwtTenantIdFromRequest(request: FastifyRequest): string {
  return resolveJwtTenantId((request as FastifyRequest & { user?: unknown }).user);
}

/**
 * Effective tenant for UM persistence and Cerbos resource attributes.
 * Platform super-admins may scope requests with `iq_tenant_id` header to another tenant.
 */
export function resolveEffectiveTenantId(request: FastifyRequest): string {
  const jwtTenant = resolveJwtTenantIdFromRequest(request);
  const headerTenant = pickHeaderTenantId(request);
  if (
    headerTenant !== undefined &&
    headerTenant !== jwtTenant &&
    isPlatformSuperAdminPrincipal((request as FastifyRequest & { user?: unknown }).user)
  ) {
    return headerTenant;
  }
  return jwtTenant;
}

export function assertTenantHeaderAllowedForPrincipal(
  request: FastifyRequest,
): { ok: true } | { ok: false; jwtTenant: string; headerTenant: string } {
  const jwtTenant = resolveJwtTenantIdFromRequest(request);
  const headerTenant = pickHeaderTenantId(request);
  if (headerTenant === undefined || headerTenant === jwtTenant) {
    return { ok: true };
  }
  if (isPlatformSuperAdminPrincipal((request as FastifyRequest & { user?: unknown }).user)) {
    return { ok: true };
  }
  return { ok: false, jwtTenant, headerTenant };
}
