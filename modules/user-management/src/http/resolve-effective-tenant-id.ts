import type { FastifyRequest } from "fastify";

function resolveJwtTenantId(user: unknown): string {
  return (user as { tenantId: string }).tenantId;
}

/** The bounded platform scope. Its presence is what grants cross-tenant / platform authority. */
const PLATFORM_SCOPE = "platform";

type CerbosPrincipalScopesSource = {
  attributes?: { scopes?: string[] };
};

function filterStrings(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((s): s is string => typeof s === "string") : [];
}

/** Bounded platform scopes from the enriched Cerbos snapshot (`request.cerbosPrincipal`). */
function scopesFromCerbosPrincipal(cerbosPrincipal?: CerbosPrincipalScopesSource): string[] {
  return filterStrings(cerbosPrincipal?.attributes?.scopes);
}

/** Bounded platform scopes from the verified JWT identity (`request.user.scopes`). */
function scopesFromRequestUser(user: unknown): string[] {
  if (user == null || typeof user !== "object") return [];
  return filterStrings((user as { scopes?: unknown }).scopes);
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
 * Bounded platform operators may scope requests with `iq_tenant_id` header to another tenant.
 */
function cerbosPrincipalFromRequest(
  request: FastifyRequest,
): CerbosPrincipalScopesSource | undefined {
  return (request as FastifyRequest & { cerbosPrincipal?: CerbosPrincipalScopesSource })
    .cerbosPrincipal;
}

/**
 * Whether the request's verified principal is a bounded platform operator (scope:platform).
 * Authority to scope cross-tenant (`iq_tenant_id` header) AND to set platform-controlled flags
 * (a role's `is_system`) flows from the additive platform SCOPE — never the dead "super-admin"
 * role string. Reads the enriched Cerbos snapshot scopes, falling back to the JWT identity
 * scopes so the header gate holds even for callers evaluated before enrichment.
 */
export function isPlatformSuperAdminRequest(request: FastifyRequest): boolean {
  if (scopesFromCerbosPrincipal(cerbosPrincipalFromRequest(request)).includes(PLATFORM_SCOPE)) {
    return true;
  }
  const requestUser = (request as FastifyRequest & { user?: unknown }).user;
  return scopesFromRequestUser(requestUser).includes(PLATFORM_SCOPE);
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
  if (
    headerTenant !== undefined &&
    headerTenant !== jwtTenant &&
    isPlatformSuperAdminRequest(request)
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
  if (headerTenant === undefined || headerTenant === jwtTenant) {
    return { ok: true };
  }
  if (isPlatformSuperAdminRequest(request)) {
    return { ok: true };
  }
  return { ok: false, jwtTenant, headerTenant };
}
