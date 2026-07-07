import type { AuthzTargetResolver } from "@hims/ts-sdk-authz";
import {
  buildCerbosUserMgmtResourceAttr,
  resolveEffectiveTenantId,
  resolveJwtTenantIdFromRequest,
} from "@hims/user-management";
import type { FastifyRequest } from "fastify";

export type UserProfileForAuthz = {
  org_id: string | null;
  department: string | null;
  /** Maps to Cerbos `resource.attr.required_clearance` (0–3). */
  clearance_tier_required: number;
};

export type UserManagementAuthzResolverDeps = {
  getUserProfile: (tenantId: string, userId: string) => Promise<UserProfileForAuthz | null>;
};

function normalizeUrl(url: string): string {
  const path = url.split("?")[0] ?? "";
  if (path.length > 1 && path.endsWith("/")) {
    return path.slice(0, -1);
  }
  return path;
}

const ROUTE_PREFIX = "/api/user-management";

function resolveRoutePattern(request: Parameters<AuthzTargetResolver>[0]): string {
  const route = (request.routeOptions?.url ?? "") as string;
  const raw = route.length > 0 ? normalizeUrl(route) : normalizeUrl(request.url);
  return raw.startsWith(ROUTE_PREFIX) ? raw.slice(ROUTE_PREFIX.length) || "/" : raw;
}

function resolvePathParam(
  request: Parameters<AuthzTargetResolver>[0],
  name = "id",
): string | null {
  const params = request.params;
  if (params == null || typeof params !== "object") return null;
  const id = (params as Record<string, unknown>)[name];
  return typeof id === "string" && id.length > 0 ? id : null;
}

function resolveResourceTenantId(request: Parameters<AuthzTargetResolver>[0]): string {
  return resolveEffectiveTenantId(request as FastifyRequest);
}

function tenantAttr(request: Parameters<AuthzTargetResolver>[0]) {
  return buildCerbosUserMgmtResourceAttr({
    iq_tenant_id: resolveResourceTenantId(request),
    department: request.user.department ?? null,
    required_clearance: 0,
  });
}

/** Auth shell routes always scope Cerbos to the signed-in user's JWT home tenant. */
function authSelfTenantAttr(request: Parameters<AuthzTargetResolver>[0]) {
  return buildCerbosUserMgmtResourceAttr({
    iq_tenant_id: resolveJwtTenantIdFromRequest(request as FastifyRequest),
    department: request.user.department ?? null,
    required_clearance: 0,
  });
}

async function userResourceAttr(
  deps: UserManagementAuthzResolverDeps,
  request: Parameters<AuthzTargetResolver>[0],
  userId: string,
): Promise<ReturnType<typeof buildCerbosUserMgmtResourceAttr>> {
  const tenantId = resolveResourceTenantId(request);
  const profile = await deps.getUserProfile(tenantId, userId);
  return buildCerbosUserMgmtResourceAttr({
    iq_tenant_id: tenantId,
    department: profile?.department ?? null,
    required_clearance: profile?.clearance_tier_required ?? 0,
    org_id: profile?.org_id ?? null,
  });
}

type AuthzRequest = Parameters<AuthzTargetResolver>[0];
type AuthzTarget = Awaited<ReturnType<AuthzTargetResolver>>;
type RouteHandler = (
  deps: UserManagementAuthzResolverDeps,
  request: AuthzRequest,
) => AuthzTarget | Promise<AuthzTarget>;

/**
 * Builds a handler for a route with a fixed (non-parameterised) Cerbos id, scoped to the
 * caller's effective resource tenant. Covers list/create/internal-catalog style endpoints.
 */
function tenantScoped(
  kind: string,
  id: string,
  action: string,
): RouteHandler {
  return (_deps, request) => ({ kind, id, action, attr: tenantAttr(request) });
}

/**
 * Builds a handler for a `:id` route whose Cerbos id is the path id but whose attributes stay
 * tenant-scoped (the path id need not be resolved into a user profile — e.g. capability/role reads).
 */
function pathIdTenantScoped(kind: string, action: string): RouteHandler {
  return (_deps, request) => {
    const id = resolvePathParam(request);
    if (id === null) return null;
    return { kind, id, action, attr: tenantAttr(request) };
  };
}

/**
 * Builds a handler for a `:id` route targeting a specific user, where Cerbos attributes are derived
 * from that user's profile (department/clearance/org). Returns null when the path id is absent.
 */
function userScoped(action: string): RouteHandler {
  return async (deps, request) => {
    const id = resolvePathParam(request);
    if (id === null) return null;
    return { kind: "user", id, action, attr: await userResourceAttr(deps, request, id) };
  };
}

/** Auth shell handler scoping Cerbos to the caller's JWT home tenant (never a header override). */
function authSelf(): RouteHandler {
  return (_deps, request) => ({
    // `/auth/*` endpoints are shell support: principal snapshot for SPA capability hydration.
    // They must not require `users:users:read`, otherwise role admins without user.read
    // could not load the principal used for navigation gating.
    // Cerbos `auth` policy matches principal/resource `iq_tenant_id`; never use cross-tenant
    // header scope here (super-admin `iq_tenant_id` is for operational APIs only).
    kind: "auth",
    id: "self",
    action: "auth.read",
    attr: authSelfTenantAttr(request),
  });
}

/**
 * Route table keyed by `${method} ${routePattern}`. HEAD is folded into GET before lookup.
 * Path patterns are post-prefix (the `/api/user-management` prefix is stripped by resolveRoutePattern).
 */
const ROUTE_TABLE: Record<string, RouteHandler> = {
  "GET /users": tenantScoped("user", "list", "user.read"),
  "POST /users": tenantScoped("user", "new", "user.create"),

  "GET /capabilities": tenantScoped("capability", "list", "capability.read"),
  "GET /capabilities/assignable": tenantScoped("capability", "assignable", "capability.read"),
  "GET /internal/runtime-capability-catalog": tenantScoped(
    "capability",
    "internal-catalog",
    "capability.read",
  ),
  "GET /internal/runtime-capability-catalog/assignable": tenantScoped(
    "capability",
    "internal-assignable",
    "capability.read",
  ),
  "GET /internal/module-entitlements/:tenantId": tenantScoped(
    "capability",
    "internal-entitlements",
    "capability.read",
  ),
  "GET /capabilities/:id": pathIdTenantScoped("capability", "capability.read"),

  "GET /roles": tenantScoped("role", "list", "role.read"),
  "POST /roles": tenantScoped("role", "new", "role.create"),
  "GET /roles/:id": pathIdTenantScoped("role", "role.read"),
  "PATCH /roles/:id": pathIdTenantScoped("role", "role.update"),
  "DELETE /roles/:id": pathIdTenantScoped("role", "role.delete"),
  "GET /roles/:id/capabilities": pathIdTenantScoped("role", "role.read"),
  "PUT /roles/:id/capabilities": pathIdTenantScoped("role", "role.update"),

  "GET /users/:id/roles": userScoped("user.read"),
  "POST /users/:id/roles": tenantScoped("user_role_template", "new", "role.assign"),
  "DELETE /users/:id/roles/:roleId": tenantScoped("user_role_template", "revoke", "role.revoke"),
  "GET /users/:id/capabilities": userScoped("user.read"),
  "GET /users/:id/effective-capabilities": userScoped("user.read"),
  "GET /users/:id": userScoped("user.read"),
  "PATCH /users/:id": userScoped("user.update"),
  "PUT /users/:id/capabilities": tenantScoped("user_role_template", "new", "role.assign"),
  "POST /users/:id/deactivate": userScoped("user.deactivate"),
  "POST /users/:id/activate": userScoped("user.activate"),
  // Distinct action from user.update (authn spec §3.5) so account recovery can be authorized
  // separately from routine profile edits. Capability gate currently reuses users:users:update
  // (see infra/cerbos/policies/user_management/user.yaml); task 9 may split out a dedicated
  // users:users:reset_password capability.
  "POST /users/:id/reset-password": userScoped("user.reset_password"),

  "GET /providers": tenantScoped("auth", "provider-list", "auth.read"),
  "GET /auth/me": authSelf(),
  "GET /auth/principal": authSelf(),
  // Self-service must-change-password completion (authMode:"protected"): the caller holds a JWT
  // and acts on their own account. Scoped to their home tenant like the other /auth/* shell routes.
  "POST /auth/change-password-complete": authSelf(),
};

export function createUserManagementAuthzTargetResolver(
  deps: UserManagementAuthzResolverDeps,
): AuthzTargetResolver {
  return async (request) => {
    const path = resolveRoutePattern(request);
    const method = request.method === "HEAD" ? "GET" : request.method;
    const handler = ROUTE_TABLE[`${method} ${path}`];
    return handler ? await handler(deps, request) : null;
  };
}
