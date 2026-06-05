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

export function createUserManagementAuthzTargetResolver(
  deps: UserManagementAuthzResolverDeps,
): AuthzTargetResolver {
  return async (request) => {
    const path = resolveRoutePattern(request);
    const method = request.method === "HEAD" ? "GET" : request.method;

    if (method === "GET" && path === "/users") {
      return { kind: "user", id: "list", action: "user.read", attr: tenantAttr(request) };
    }

    if (method === "POST" && path === "/users") {
      return { kind: "user", id: "new", action: "user.create", attr: tenantAttr(request) };
    }

    if (method === "GET" && path === "/capabilities") {
      return { kind: "capability", id: "list", action: "capability.read", attr: tenantAttr(request) };
    }

    if (method === "GET" && path === "/capabilities/assignable") {
      return { kind: "capability", id: "assignable", action: "capability.read", attr: tenantAttr(request) };
    }

    if (method === "GET" && path === "/internal/runtime-capability-catalog") {
      return {
        kind: "capability",
        id: "internal-catalog",
        action: "capability.read",
        attr: tenantAttr(request),
      };
    }

    if (method === "GET" && path === "/internal/runtime-capability-catalog/assignable") {
      return {
        kind: "capability",
        id: "internal-assignable",
        action: "capability.read",
        attr: tenantAttr(request),
      };
    }

    if (method === "GET" && path === "/internal/module-entitlements/:tenantId") {
      return {
        kind: "capability",
        id: "internal-entitlements",
        action: "capability.read",
        attr: tenantAttr(request),
      };
    }

    if (method === "GET" && path === "/capabilities/:id") {
      const id = resolvePathParam(request);
      if (id === null) return null;
      return { kind: "capability", id, action: "capability.read", attr: tenantAttr(request) };
    }

    if (method === "GET" && path === "/roles") {
      return { kind: "role", id: "list", action: "role.read", attr: tenantAttr(request) };
    }

    if (method === "POST" && path === "/roles") {
      return { kind: "role", id: "new", action: "role.create", attr: tenantAttr(request) };
    }

    if (method === "GET" && path === "/roles/:id") {
      const id = resolvePathParam(request);
      if (id === null) return null;
      return { kind: "role", id, action: "role.read", attr: tenantAttr(request) };
    }

    if (method === "PATCH" && path === "/roles/:id") {
      const id = resolvePathParam(request);
      if (id === null) return null;
      return { kind: "role", id, action: "role.update", attr: tenantAttr(request) };
    }

    if (method === "DELETE" && path === "/roles/:id") {
      const id = resolvePathParam(request);
      if (id === null) return null;
      return { kind: "role", id, action: "role.delete", attr: tenantAttr(request) };
    }

    if (method === "GET" && path === "/roles/:id/capabilities") {
      const id = resolvePathParam(request);
      if (id === null) return null;
      return { kind: "role", id, action: "role.read", attr: tenantAttr(request) };
    }

    if (method === "PUT" && path === "/roles/:id/capabilities") {
      const id = resolvePathParam(request);
      if (id === null) return null;
      return { kind: "role", id, action: "role.update", attr: tenantAttr(request) };
    }

    if (method === "GET" && path === "/users/:id/roles") {
      const id = resolvePathParam(request);
      if (id === null) return null;
      return {
        kind: "user",
        id,
        action: "user.read",
        attr: await userResourceAttr(deps, request, id),
      };
    }

    if (method === "POST" && path === "/users/:id/roles") {
      return { kind: "user_role_template", id: "new", action: "role.assign", attr: tenantAttr(request) };
    }

    if (method === "DELETE" && path === "/users/:id/roles/:roleId") {
      return {
        kind: "user_role_template",
        id: "revoke",
        action: "role.revoke",
        attr: tenantAttr(request),
      };
    }

    if (method === "GET" && path === "/users/:id/capabilities") {
      const id = resolvePathParam(request);
      if (id === null) return null;
      return {
        kind: "user",
        id,
        action: "user.read",
        attr: await userResourceAttr(deps, request, id),
      };
    }

    if (method === "GET" && path === "/users/:id/effective-capabilities") {
      const id = resolvePathParam(request);
      if (id === null) return null;
      return {
        kind: "user",
        id,
        action: "user.read",
        attr: await userResourceAttr(deps, request, id),
      };
    }

    if (method === "GET" && path === "/users/:id") {
      const id = resolvePathParam(request);
      if (id === null) return null;
      return {
        kind: "user",
        id,
        action: "user.read",
        attr: await userResourceAttr(deps, request, id),
      };
    }

    if (method === "PATCH" && path === "/users/:id") {
      const id = resolvePathParam(request);
      if (id === null) return null;
      return {
        kind: "user",
        id,
        action: "user.update",
        attr: await userResourceAttr(deps, request, id),
      };
    }

    if (method === "PUT" && path === "/users/:id/capabilities") {
      return {
        kind: "user_role_template",
        id: "new",
        action: "role.assign",
        attr: tenantAttr(request),
      };
    }

    if (method === "POST" && path === "/users/:id/deactivate") {
      const id = resolvePathParam(request);
      if (id === null) return null;
      return {
        kind: "user",
        id,
        action: "user.deactivate",
        attr: await userResourceAttr(deps, request, id),
      };
    }

    if (method === "GET" && path === "/providers") {
      return { kind: "auth", id: "provider-list", action: "auth.read", attr: tenantAttr(request) };
    }

    if (method === "POST" && path === "/partner-principals") {
      return {
        kind: "integration_partner",
        id: "new",
        action: "partner.provision",
        attr: tenantAttr(request),
      };
    }

    if (method === "POST" && path === "/partner-principals/:integrationId/deactivate") {
      const integrationId = resolvePathParam(request, "integrationId");
      return {
        kind: "integration_partner",
        id: integrationId ?? "deactivate",
        action: "partner.deactivate",
        attr: tenantAttr(request),
      };
    }

    if (
      method === "GET" &&
      (path === "/auth/me" || path === "/auth/principal")
    ) {
      return {
        // `/auth/*` endpoints are shell support: principal snapshot for SPA capability hydration.
        // They must not require `users:users:read`, otherwise role admins without user.read
        // could not load the principal used for navigation gating.
        // Cerbos `auth` policy matches principal/resource `iq_tenant_id`; never use cross-tenant
        // header scope here (super-admin `iq_tenant_id` is for operational APIs only).
        kind: "auth",
        id: "self",
        action: "auth.read",
        attr: authSelfTenantAttr(request),
      };
    }

    return null;
  };
}
