import type { AuthzTargetResolver } from "@hims/ts-sdk-authz";

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
  return { iq_tenant_id: request.user.tenantId };
}

export const resolveUserManagementAuthzTarget: AuthzTargetResolver = (request) => {
  const path = resolveRoutePattern(request);
  const method = request.method;

  if (method === "POST" && path === "/users") {
    return { kind: "user", id: "new", action: "user.create", attr: tenantAttr(request) };
  }

  if (method === "GET" && path === "/users/:id") {
    const id = resolveUserIdFromParams(request);
    if (id === null) return null;
    return { kind: "user", id, action: "user.read", attr: tenantAttr(request) };
  }

  if (method === "PATCH" && path === "/users/:id") {
    const id = resolveUserIdFromParams(request);
    if (id === null) return null;
    return { kind: "user", id, action: "user.update", attr: tenantAttr(request) };
  }

  if (method === "POST" && path === "/role-assignments") {
    return { kind: "role_assignment", id: "new", action: "role.assign", attr: tenantAttr(request) };
  }

  if (method === "GET" && (path === "/auth/me" || path === "/auth/principal")) {
    return { kind: "user", id: request.user.userId, action: "user.read", attr: tenantAttr(request) };
  }

  return null;
};
