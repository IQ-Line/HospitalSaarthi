import type { AuthzTargetResolver } from "@hims/ts-sdk-authz";

function normalizeUrl(url: string): string {
  const path = url.split("?")[0] ?? "";
  if (path.length > 1 && path.endsWith("/")) {
    return path.slice(0, -1);
  }
  return path;
}

const ROUTE_PREFIX = "/api/empi/v1";

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

const RESOURCE_KIND = "empi_patient";

/**
 * Handler for a route with a fixed (non-parameterised) Cerbos id, scoped to the caller's tenant.
 * Covers collection/lookup endpoints (`POST /patients`, `GET /patients`, `/patients/find`, …).
 */
function tenantScoped(id: string, action: string): RouteHandler {
  return (request) => ({ kind: RESOURCE_KIND, id, action, attr: tenantAttr(request) });
}

/**
 * Handler for a `:param` route whose Cerbos id is the resolved path param, tenant-scoped.
 * Returns null when the named path param is absent (preserving the per-route guard so the PEP
 * treats an unresolvable target as a mapping gap, not an allow).
 */
function pathIdScoped(action: string, paramName: string): RouteHandler {
  return (request) => {
    const id = resolvePathParam(request, paramName);
    if (id === null) return null;
    return { kind: RESOURCE_KIND, id, action, attr: tenantAttr(request) };
  };
}

/**
 * Route table keyed by `${method} ${routePattern}`. HEAD is folded into GET before lookup.
 * Path patterns are post-prefix (the `/api/empi/v1` prefix is stripped by resolveRoutePattern).
 *
 * Golden-record PHI actions map to the `empi:patient:{read,create,update,delete}` capabilities:
 *   - reads (search / find / detail)                    -> patient.read
 *   - registration                                       -> patient.create
 *   - demographic / status / identifier-link / address  -> patient.update
 *   - identifier removal (severs identity from record)   -> patient.delete
 */
const ROUTE_TABLE: Record<string, RouteHandler> = {
  "POST /patients": tenantScoped("new", "patient.create"),
  "GET /patients": tenantScoped("list", "patient.read"),
  "GET /patients/find": tenantScoped("find", "patient.read"),
  "POST /patients/find-by-demographics": tenantScoped("find-by-demographics", "patient.read"),
  "GET /patients/:id": pathIdScoped("patient.read", "id"),
  "PATCH /patients/:id": pathIdScoped("patient.update", "id"),
  "PATCH /patients/:id/status": pathIdScoped("patient.update", "id"),
  "POST /patients/:id/identifiers": pathIdScoped("patient.update", "id"),
  "DELETE /patients/:id/identifiers/:identifierId": pathIdScoped("patient.delete", "id"),
  "POST /patients/:id/addresses": pathIdScoped("patient.update", "id"),
  "PATCH /patients/:id/addresses/:addressId": pathIdScoped("patient.update", "id"),
};

export function createEmpiAuthzTargetResolver(): AuthzTargetResolver {
  return async (request) => {
    const path = resolveRoutePattern(request);
    const method = request.method === "HEAD" ? "GET" : request.method;
    const handler = ROUTE_TABLE[`${method} ${path}`];
    return handler ? handler(request) : null;
  };
}
