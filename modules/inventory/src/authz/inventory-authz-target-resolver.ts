import type { AuthzTargetResolver } from "@hims/ts-sdk-authz";

function normalizeUrl(url: string): string {
  const path = url.split("?")[0] ?? "";
  if (path.length > 1 && path.endsWith("/")) {
    return path.slice(0, -1);
  }
  return path;
}

const ROUTE_PREFIX = "/api/inventory/v1";

function resolveRoutePattern(request: Parameters<AuthzTargetResolver>[0]): string {
  const route = (request.routeOptions?.url ?? "") as string;
  const raw = route.length > 0 ? normalizeUrl(route) : normalizeUrl(request.url);
  return raw.startsWith(ROUTE_PREFIX) ? raw.slice(ROUTE_PREFIX.length) || "/" : raw;
}

function resolvePathParam(
  request: Parameters<AuthzTargetResolver>[0],
  name: string,
): string | null {
  const params = request.params;
  if (params == null || typeof params !== "object") return null;
  const id = (params as Record<string, unknown>)[name];
  return typeof id === "string" && id.length > 0 ? id : null;
}

function tenantAttr(request: Parameters<AuthzTargetResolver>[0]) {
  return { iq_tenant_id: (request as { tenantId?: string }).tenantId as string };
}

export function createInventoryAuthzTargetResolver(): AuthzTargetResolver {
  return async (request) => {
    const path = resolveRoutePattern(request);
    const method = request.method === "HEAD" ? "GET" : request.method;

    if (method === "GET" && path === "/stores") {
      return {
        kind: "inventory_store",
        id: "list",
        action: "inventory.store.read",
        attr: tenantAttr(request),
      };
    }

    if (method === "GET" && path === "/stores/:storeId") {
      const storeId = resolvePathParam(request, "storeId");
      return {
        kind: "inventory_store",
        id: storeId ?? "unknown",
        action: "inventory.store.read",
        attr: tenantAttr(request),
      };
    }

    if (method === "POST" && path === "/stores") {
      return {
        kind: "inventory_store",
        id: "create",
        action: "inventory.store.create",
        attr: tenantAttr(request),
      };
    }

    if ((method === "PATCH" || method === "PUT") && path === "/stores/:storeId") {
      const storeId = resolvePathParam(request, "storeId");
      return {
        kind: "inventory_store",
        id: storeId ?? "unknown",
        action: "inventory.store.update",
        attr: tenantAttr(request),
      };
    }

    return null;
  };
}
