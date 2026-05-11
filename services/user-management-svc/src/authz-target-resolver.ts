import type { AuthzTargetResolver } from "@hims/ts-sdk-authz";
import { buildCerbosUserMgmtResourceAttr } from "@hims/user-management";

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

function resolveRoutePattern(request: Parameters<AuthzTargetResolver>[0]): string {
  const route = (request.routeOptions?.url ?? "") as string;
  if (route.length > 0) {
    return normalizeUrl(route);
  }
  return normalizeUrl(request.url);
}

function resolveUserIdFromParams(request: Parameters<AuthzTargetResolver>[0]): string | null {
  const params = request.params;
  if (params == null || typeof params !== "object") return null;
  const id = (params as Record<string, unknown>)["id"];
  return typeof id === "string" && id.length > 0 ? id : null;
}

function tenantAttr(request: Parameters<AuthzTargetResolver>[0]) {
  return buildCerbosUserMgmtResourceAttr({
    iq_tenant_id: request.user.tenantId,
    department: request.user.department ?? null,
    required_clearance: 0,
  });
}

async function userResourceAttr(
  deps: UserManagementAuthzResolverDeps,
  request: Parameters<AuthzTargetResolver>[0],
  userId: string,
): Promise<ReturnType<typeof buildCerbosUserMgmtResourceAttr>> {
  const profile = await deps.getUserProfile(request.user.tenantId, userId);
  return buildCerbosUserMgmtResourceAttr({
    iq_tenant_id: request.user.tenantId,
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
    const method = request.method;

    if (method === "GET" && path === "/users") {
      return { kind: "user", id: "list", action: "user.list", attr: tenantAttr(request) };
    }

    if (method === "POST" && path === "/users") {
      return { kind: "user", id: "new", action: "user.create", attr: tenantAttr(request) };
    }

    if (method === "GET" && path === "/users/:id") {
      const id = resolveUserIdFromParams(request);
      if (id === null) return null;
      return {
        kind: "user",
        id,
        action: "user.read",
        attr: await userResourceAttr(deps, request, id),
      };
    }

    if (method === "PATCH" && path === "/users/:id") {
      const id = resolveUserIdFromParams(request);
      if (id === null) return null;
      return {
        kind: "user",
        id,
        action: "user.update",
        attr: await userResourceAttr(deps, request, id),
      };
    }

    if (method === "POST" && path === "/role-assignments") {
      return { kind: "role_assignment", id: "new", action: "role.assign", attr: tenantAttr(request) };
    }

    if (method === "DELETE" && path === "/role-assignments") {
      return { kind: "role_assignment", id: "revoke", action: "role.revoke", attr: tenantAttr(request) };
    }

    if (method === "POST" && path === "/users/:id/deactivate") {
      const id = resolveUserIdFromParams(request);
      if (id === null) return null;
      return {
        kind: "user",
        id,
        action: "user.delete",
        attr: await userResourceAttr(deps, request, id),
      };
    }

    if (
      method === "GET" &&
      (path === "/auth/me" || path === "/auth/principal" || path === "/auth/permissions-map")
    ) {
      return {
        kind: "user",
        id: request.user.userId,
        action: "user.read",
        attr: await userResourceAttr(deps, request, request.user.userId),
      };
    }

    return null;
  };
}
