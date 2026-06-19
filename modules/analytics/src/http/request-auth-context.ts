import type { FastifyRequest } from "fastify";

export const PLATFORM_SUPER_ADMIN_ROLE = "super-admin";
export const TENANT_ADMIN_ROLE = "tenant-admin";

type RequestUser = {
  roles?: unknown;
  userId?: string;
};

function normalizeRoles(roles: unknown): string[] {
  if (!Array.isArray(roles)) {
    return [];
  }
  return roles
    .map((role) => (typeof role === "string" ? role.trim().toLowerCase() : ""))
    .filter((role) => role.length > 0);
}

function readBearerJwtPayload(request: FastifyRequest): Record<string, unknown> | null {
  const header = request.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    return null;
  }
  const parts = header.slice(7).split(".");
  const payloadSegment = parts[1];
  if (parts.length !== 3 || !payloadSegment) {
    return null;
  }
  try {
    const json = Buffer.from(payloadSegment, "base64url").toString("utf8");
    const payload = JSON.parse(json) as unknown;
    return payload !== null && typeof payload === "object" && !Array.isArray(payload)
      ? (payload as Record<string, unknown>)
      : null;
  } catch {
    return null;
  }
}

function authContextFromBearerJwt(request: FastifyRequest): RequestAuthContext {
  const payload = readBearerJwtPayload(request);
  if (!payload) {
    return { roles: [], userId: null, tenantId: null };
  }
  const userIdRaw = payload["sub"];
  const userId =
    typeof userIdRaw === "string" && userIdRaw.trim().length > 0 ? userIdRaw.trim() : null;
  const tenantIdRaw = payload["iq_tenant_id"];
  const tenantId =
    typeof tenantIdRaw === "string" && tenantIdRaw.trim().length > 0 ? tenantIdRaw.trim() : null;
  return {
    roles: normalizeRoles(payload["roles"]),
    userId,
    tenantId,
  };
}

export function isPlatformSuperAdminRole(role: string): boolean {
  return role.trim().toLowerCase() === PLATFORM_SUPER_ADMIN_ROLE;
}

export function isPlatformSuperAdmin(roles: readonly string[]): boolean {
  return roles.some(isPlatformSuperAdminRole);
}

export interface RequestAuthContext {
  roles: string[];
  userId: string | null;
  tenantId: string | null;
}

function resolveJwtTenantIdFromRequest(request: FastifyRequest): string | null {
  const user = (
    request as FastifyRequest & { user?: { tenantId?: string; iq_tenant_id?: string } }
  ).user;
  if (user?.tenantId?.trim()) {
    return user.tenantId.trim();
  }
  if (user?.iq_tenant_id?.trim()) {
    return user.iq_tenant_id.trim();
  }
  return authContextFromBearerJwt(request).tenantId;
}

export function getRequestAuthContext(request: FastifyRequest): RequestAuthContext {
  const user = (
    request as FastifyRequest & {
      user?: RequestUser & { tenantId?: string; userId?: string; sub?: string };
    }
  ).user;
  if (user) {
    const tenantId =
      typeof user.tenantId === "string" && user.tenantId.trim().length > 0
        ? user.tenantId.trim()
        : null;
    const userIdRaw = user.userId ?? user.sub;
    const userId =
      typeof userIdRaw === "string" && userIdRaw.trim().length > 0 ? userIdRaw.trim() : null;
    return {
      roles: normalizeRoles(user.roles),
      userId,
      tenantId,
    };
  }
  return authContextFromBearerJwt(request);
}

export function isTenantAdminRole(role: string): boolean {
  return role.trim().toLowerCase() === TENANT_ADMIN_ROLE;
}

export function isTenantAdmin(roles: readonly string[]): boolean {
  return roles.some(isTenantAdminRole);
}

export function assertPlatformSuperAdmin(request: FastifyRequest): void {
  const { roles } = getRequestAuthContext(request);
  if (!isPlatformSuperAdmin(roles)) {
    const err = new Error("platform super-admin role is required");
    (err as Error & { statusCode: number }).statusCode = 403;
    throw err;
  }
}

/** OPD registration & billing report: platform super-admin or tenant-admin (tenant-scoped). */
export function assertOpdRegistrationBillingReportAccess(request: FastifyRequest): void {
  const { roles } = getRequestAuthContext(request);
  if (isPlatformSuperAdmin(roles) || isTenantAdmin(roles)) {
    return;
  }
  const err = new Error("platform super-admin or tenant-admin role is required");
  (err as Error & { statusCode: number }).statusCode = 403;
  throw err;
}

/**
 * Super-admins may scope via `iq_tenant_id` header; tenant-admins are always bound to JWT home tenant.
 */
export function resolveOpdRegistrationBillingReportTenantId(request: FastifyRequest): string {
  const jwtTenant = resolveJwtTenantIdFromRequest(request);
  if (!jwtTenant) {
    const err = new Error("Missing iq_tenant_id on authenticated principal");
    (err as Error & { statusCode: number }).statusCode = 400;
    throw err;
  }

  const { roles } = getRequestAuthContext(request);
  if (isPlatformSuperAdmin(roles)) {
    const headerTenant = request.tenantId?.trim();
    return headerTenant && headerTenant.length > 0 ? headerTenant : jwtTenant;
  }

  // Tenant-admin: always bound to JWT home tenant (ignore cross-tenant headers).
  return jwtTenant;
}
