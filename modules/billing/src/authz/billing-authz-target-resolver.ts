import type { AuthzTargetResolver } from "@hims/ts-sdk-authz";

function normalizeUrl(url: string): string {
  const path = url.split("?")[0] ?? "";
  if (path.length > 1 && path.endsWith("/")) {
    return path.slice(0, -1);
  }
  return path;
}

const ROUTE_PREFIX = "/api/billing/v1";

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
  return { iq_tenant_id: (request as any).tenantId as string };
}

export function createBillingAuthzTargetResolver(): AuthzTargetResolver {
  return async (request) => {
    const path = resolveRoutePattern(request);
    const method = request.method === "HEAD" ? "GET" : request.method;

    if (method === "GET" && path === "/services") {
      return { kind: "tariff_master", id: "list", action: "tariff-master.read", attr: tenantAttr(request) };
    }

    if (method === "POST" && path === "/services") {
      return { kind: "tariff_master", id: "new", action: "tariff-master.create", attr: tenantAttr(request) };
    }

    if (method === "PATCH" && path === "/services/:service_id") {
      const id = resolvePathParam(request, "service_id");
      if (id === null) return null;
      return { kind: "tariff_master", id, action: "tariff-master.update", attr: tenantAttr(request) };
    }

    if (method === "GET" && path === "/consultation-types") {
      return {
        kind: "tariff_master",
        id: "consultation-types",
        action: "tariff-master.read",
        attr: tenantAttr(request),
      };
    }

    if (method === "POST" && path === "/provider-consultation-tariffs/bulk-upsert") {
      return {
        kind: "tariff_master",
        id: "provider-consultation-bulk",
        action: "tariff-master.create",
        attr: tenantAttr(request),
      };
    }

    if (method === "GET" && path === "/provider-consultation-tariffs") {
      return {
        kind: "tariff_master",
        id: "provider-consultation-list",
        action: "tariff-master.read",
        attr: tenantAttr(request),
      };
    }

    if (method === "POST" && path === "/charges") {
      return { kind: "invoice", id: "new", action: "invoice.create", attr: tenantAttr(request) };
    }

    if (method === "GET" && path === "/bills") {
      return { kind: "invoice", id: "list", action: "invoice.read", attr: tenantAttr(request) };
    }

    if (method === "GET" && path === "/bills/:bill_id") {
      const id = resolvePathParam(request, "bill_id");
      if (id === null) return null;
      return { kind: "invoice", id, action: "invoice.read", attr: tenantAttr(request) };
    }

    if (method === "PATCH" && path === "/bills/:bill_id") {
      const id = resolvePathParam(request, "bill_id");
      if (id === null) return null;
      return { kind: "invoice", id, action: "invoice.update", attr: tenantAttr(request) };
    }

    if (method === "POST" && path === "/bills/:bill_id/finalize") {
      const id = resolvePathParam(request, "bill_id");
      if (id === null) return null;
      return { kind: "invoice", id, action: "invoice.update", attr: tenantAttr(request) };
    }

    if (method === "POST" && path === "/bills/:bill_id/cancel") {
      const id = resolvePathParam(request, "bill_id");
      if (id === null) return null;
      return { kind: "invoice", id, action: "invoice.delete", attr: tenantAttr(request) };
    }

    if (method === "GET" && path === "/bills/:bill_id/receipt.pdf") {
      const id = resolvePathParam(request, "bill_id");
      if (id === null) return null;
      return { kind: "invoice", id, action: "invoice.read", attr: tenantAttr(request) };
    }

    if (method === "POST" && path === "/payments") {
      return { kind: "billing_account", id: "new", action: "billing-account.create", attr: tenantAttr(request) };
    }

    return null;
  };
}
