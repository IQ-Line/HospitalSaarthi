import type { AuthzTargetResolver } from "@hims/ts-sdk-authz";

function normalizeUrl(url: string): string {
  const path = url.split("?")[0] ?? "";
  if (path.length > 1 && path.endsWith("/")) {
    return path.slice(0, -1);
  }
  return path;
}

const ROUTE_PREFIX = "/api/pharmacy/v1";

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

export function createPharmacyAuthzTargetResolver(): AuthzTargetResolver {
  return async (request) => {
    const path = resolveRoutePattern(request);
    const method = request.method === "HEAD" ? "GET" : request.method;

    if (method === "GET" && path === "/queue") {
      return { kind: "pharmacy_queue", id: "list", action: "pharmacy.read", attr: tenantAttr(request) };
    }

    if (method === "GET" && path === "/visits/:visitId/dispense-order") {
      const visitId = resolvePathParam(request, "visitId");
      return {
        kind: "pharmacy_dispense_order",
        id: visitId ?? "unknown",
        action: "pharmacy.read",
        attr: tenantAttr(request),
      };
    }

    if (
      (method === "PUT" || method === "PATCH") &&
      path === "/visits/:visitId/dispense-order"
    ) {
      const visitId = resolvePathParam(request, "visitId");
      return {
        kind: "pharmacy_dispense_order",
        id: visitId ?? "unknown",
        action: "pharmacy.update",
        attr: tenantAttr(request),
      };
    }

    if (method === "POST" && path === "/manual-dispense-issues") {
      return {
        kind: "pharmacy_dispense_order",
        id: "manual",
        action: "pharmacy.update",
        attr: tenantAttr(request),
      };
    }

    if (method === "POST" && path === "/walk-in-dispense-orders") {
      return {
        kind: "pharmacy_walk_in_dispense_order",
        id: "create",
        action: "pharmacy.update",
        attr: tenantAttr(request),
      };
    }

    if (method === "GET" && path === "/walk-in-dispense-orders/:recordId") {
      const recordId = resolvePathParam(request, "recordId");
      return {
        kind: "pharmacy_walk_in_dispense_order",
        id: recordId ?? "unknown",
        action: "pharmacy.read",
        attr: tenantAttr(request),
      };
    }

    if (
      (method === "PUT" || method === "PATCH") &&
      path === "/walk-in-dispense-orders/:recordId"
    ) {
      const recordId = resolvePathParam(request, "recordId");
      return {
        kind: "pharmacy_walk_in_dispense_order",
        id: recordId ?? "unknown",
        action: "pharmacy.update",
        attr: tenantAttr(request),
      };
    }

    if (method === "GET" && path === "/dispense-transactions/search") {
      return {
        kind: "pharmacy_dispense_return",
        id: "search",
        action: "pharmacy.read",
        attr: tenantAttr(request),
      };
    }

    if (method === "GET" && path === "/dispense-transactions/:dispenseId/return-eligibility") {
      const dispenseId = resolvePathParam(request, "dispenseId");
      return {
        kind: "pharmacy_dispense_return",
        id: dispenseId ?? "unknown",
        action: "pharmacy.read",
        attr: tenantAttr(request),
      };
    }

    if (method === "GET" && path === "/returns") {
      return {
        kind: "pharmacy_dispense_return",
        id: "list",
        action: "pharmacy.read",
        attr: tenantAttr(request),
      };
    }

    if (method === "POST" && path === "/returns") {
      return {
        kind: "pharmacy_dispense_return",
        id: "create",
        action: "pharmacy.update",
        attr: tenantAttr(request),
      };
    }

    if (method === "GET" && path === "/returns/:returnId") {
      const returnId = resolvePathParam(request, "returnId");
      return {
        kind: "pharmacy_dispense_return",
        id: returnId ?? "unknown",
        action: "pharmacy.read",
        attr: tenantAttr(request),
      };
    }

    return null;
  };
}
