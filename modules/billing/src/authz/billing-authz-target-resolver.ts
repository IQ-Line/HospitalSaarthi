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
  return { iq_tenant_id: request.tenantId };
}

type AuthzRequest = Parameters<AuthzTargetResolver>[0];
type AuthzTarget = Awaited<ReturnType<AuthzTargetResolver>>;
type RouteHandler = (request: AuthzRequest) => AuthzTarget;

/**
 * Handler for a route with a fixed (non-parameterised) Cerbos id, scoped to the caller's tenant.
 * Covers list/create style endpoints (`/services`, `/charges`, `/bills`, `/payments`).
 */
function tenantScoped(kind: string, id: string, action: string): RouteHandler {
  return (request) => ({ kind, id, action, attr: tenantAttr(request) });
}

/**
 * Handler for a `:param` route whose Cerbos id is the resolved path param, tenant-scoped.
 * Returns null when the named path param is absent (preserving the per-route guard).
 */
function pathIdScoped(kind: string, action: string, paramName: string): RouteHandler {
  return (request) => {
    const id = resolvePathParam(request, paramName);
    if (id === null) return null;
    return { kind, id, action, attr: tenantAttr(request) };
  };
}

/**
 * Route table keyed by `${method} ${routePattern}`. HEAD is folded into GET before lookup.
 * Path patterns are post-prefix (the `/api/billing/v1` prefix is stripped by resolveRoutePattern).
 */
const ROUTE_TABLE: Record<string, RouteHandler> = {
  "GET /services": tenantScoped("tariff_master", "list", "tariff-master.read"),
  "POST /services": tenantScoped("tariff_master", "new", "tariff-master.create"),
  "PATCH /services/:service_id": pathIdScoped("tariff_master", "tariff-master.update", "service_id"),

  "POST /charges": tenantScoped("invoice", "new", "invoice.create"),
  "GET /bills": tenantScoped("invoice", "list", "invoice.read"),
  "GET /bills/:bill_id": pathIdScoped("invoice", "invoice.read", "bill_id"),
  "PATCH /bills/:bill_id": pathIdScoped("invoice", "invoice.update", "bill_id"),
  "POST /bills/:bill_id/finalize": pathIdScoped("invoice", "invoice.update", "bill_id"),
  "POST /bills/:bill_id/cancel": pathIdScoped("invoice", "invoice.delete", "bill_id"),
  "GET /bills/:bill_id/receipt.pdf": pathIdScoped("invoice", "invoice.read", "bill_id"),

  "POST /payments": tenantScoped("billing_account", "new", "billing-account.create"),
};

export function createBillingAuthzTargetResolver(): AuthzTargetResolver {
  return async (request) => {
    const path = resolveRoutePattern(request);
    const method = request.method === "HEAD" ? "GET" : request.method;
    const handler = ROUTE_TABLE[`${method} ${path}`];
    return handler ? handler(request) : null;
  };
}
