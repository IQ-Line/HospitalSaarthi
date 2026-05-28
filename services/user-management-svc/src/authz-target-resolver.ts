import type { AuthzTargetResolver } from "@hims/ts-sdk-authz";
import {
  resolveRoutePattern,
  resolvePathParam,
} from "@hims/ts-sdk-authz";
import {
  buildCerbosUserMgmtResourceAttr,
  resolveEffectiveTenantId,
} from "@hims/user-management";
import type { FastifyRequest } from "fastify";

export type UserProfileForAuthz = {
  org_id: string | null;
  department: string | null;
  clearance_tier_required: number;
};

export type UserManagementAuthzResolverDeps = {
  getUserProfile: (tenantId: string, userId: string) => Promise<UserProfileForAuthz | null>;
};

const ROUTE_PREFIX = "/api/user-management";

function resolveResourceTenantId(request: Parameters<AuthzTargetResolver>[0]): string {
  return resolveEffectiveTenantId(request as FastifyRequest);
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
    const path = resolveRoutePattern(request, ROUTE_PREFIX);
    const method = request.method === "HEAD" ? "GET" : request.method;

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

    return null;
  };
}
