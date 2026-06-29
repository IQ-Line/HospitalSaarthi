import type { FastifyRequest } from "fastify";
import { PLATFORM_SUPER_ADMIN_ROLE } from "../domain/reserved-role-codes.js";

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

type CerbosPrincipalRolesSource = {
  roles?: string[];
  attributes?: { role_codes?: string[] };
};

function roleCodesFromCerbosPrincipal(
  cerbosPrincipal?: CerbosPrincipalRolesSource,
): string[] {
  const attrCodes = cerbosPrincipal?.attributes?.role_codes;
  if (Array.isArray(attrCodes)) {
    return attrCodes.filter((r): r is string => typeof r === "string");
  }
  const persistedRoles = cerbosPrincipal?.roles;
  if (!Array.isArray(persistedRoles)) {
    return [];
  }
  return persistedRoles.filter((r): r is string => typeof r === "string");
}

export function isPlatformSuperAdminPrincipal(
  user: unknown,
  cerbosPrincipal?: CerbosPrincipalRolesSource,
): boolean {
  if (resolveJwtRoles(user).some(isPlatformSuperAdminRole)) {
    return true;
  }
  if (roleCodesFromCerbosPrincipal(cerbosPrincipal).some(isPlatformSuperAdminRole)) {
    return true;
  }
  const persistedRoles = cerbosPrincipal?.roles;
  if (!Array.isArray(persistedRoles)) {
    return false;
  }
  return persistedRoles.some(isPlatformSuperAdminRole);
}

type RawHeaderValue = string | string[] | undefined;

function asSingleHeaderValue(value: RawHeaderValue): string | undefined {
  const raw = Array.isArray(value) ? value[0] : value;
  if (typeof raw !== "string") {
    return undefined;
  }
  const trimmed = raw.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

/** Matches {@link packages/ts-sdk-tenant} — proxies may send `string[]` or `x-tenant-id`. */
function pickHeaderTenantId(request: FastifyRequest): string | undefined {
  const headers = request.headers;
  return (
    asSingleHeaderValue(headers?.["iq_tenant_id"] as RawHeaderValue) ??
    asSingleHeaderValue(headers?.["x-tenant-id"] as RawHeaderValue)
  );
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
function cerbosPrincipalFromRequest(request: FastifyRequest): CerbosPrincipalRolesSource | undefined {
  const raw = (request as FastifyRequest & { cerbosPrincipal?: CerbosPrincipalRolesSource }).cerbosPrincipal;
  return raw;
}

function isApiKeyAuthenticatedRequest(request: FastifyRequest): boolean {
  const req = request as FastifyRequest & { authViaApiKey?: boolean; tenantId?: string };
  return req.authViaApiKey === true && typeof req.tenantId === "string" && req.tenantId.length > 0;
}

export function resolveEffectiveTenantId(request: FastifyRequest): string {
  if (isApiKeyAuthenticatedRequest(request)) {
    return (request as FastifyRequest & { tenantId: string }).tenantId;
  }

  const jwtTenant = resolveJwtTenantIdFromRequest(request);
  const headerTenant = pickHeaderTenantId(request);
  const requestUser = (request as FastifyRequest & { user?: unknown }).user;
  if (
    headerTenant !== undefined &&
    headerTenant !== jwtTenant &&
    isPlatformSuperAdminPrincipal(requestUser, cerbosPrincipalFromRequest(request))
  ) {
    return headerTenant;
  }
  return jwtTenant;
}

export function assertTenantHeaderAllowedForPrincipal(
  request: FastifyRequest,
): { ok: true } | { ok: false; jwtTenant: string; headerTenant: string } {
  if (isApiKeyAuthenticatedRequest(request)) {
    return { ok: true };
  }

  const jwtTenant = resolveJwtTenantIdFromRequest(request);
  const headerTenant = pickHeaderTenantId(request);
  const requestUser = (request as FastifyRequest & { user?: unknown }).user;
  if (headerTenant === undefined || headerTenant === jwtTenant) {
    return { ok: true };
  }
  if (isPlatformSuperAdminPrincipal(requestUser, cerbosPrincipalFromRequest(request))) {
    return { ok: true };
  }
  return { ok: false, jwtTenant, headerTenant };
}
