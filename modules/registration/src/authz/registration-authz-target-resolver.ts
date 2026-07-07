import type { AuthzTargetResolver, AuthzTarget } from "@hims/ts-sdk-authz";
import type { FastifyRequest } from "fastify";

function resolveRoutePattern(request: Parameters<AuthzTargetResolver>[0]): string {
  const route = (request.routeOptions?.url ?? "") as string;
  const raw = route.length > 0 ? route : request.url;
  const path = raw.split("?")[0] ?? "";
  return path.length > 1 && path.endsWith("/") ? path.slice(0, -1) : path;
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

function tenantAttr(request: FastifyRequest): Record<string, unknown> {
  const tenantId = (request as unknown as { tenantId?: string }).tenantId ?? "";
  return { iq_tenant_id: tenantId };
}

const PREFIX = "/api/registration/v1";

function stripPrefix(path: string): string {
  return path.startsWith(PREFIX) ? path.slice(PREFIX.length) || "/" : path;
}

const REGISTRATION_DOCUMENT_PATHS = new Set([
  "/registrations/:registrationId/documents/opd-slip.pdf",
  "/registrations/:registrationId/documents/opd-slip.html",
  "/registrations/:registrationId/documents/opd-receipt.html",
  "/registrations/:registrationId/documents/opd-receipt.pdf",
]);

type RegistrationAuthzAction =
  | "registration.read"
  | "registration.create"
  | "registration.update"
  | "registration.update_status";

function readTarget(
  request: FastifyRequest,
  id: string,
  action: RegistrationAuthzAction,
): AuthzTarget {
  return { kind: "registration", id, action, attr: tenantAttr(request) };
}

/**
 * Describes how to build an {@link AuthzTarget} for one exact (method, path)
 * route: which path param (if any) carries the resource id, the id to fall
 * back to when that param is absent, and the action being authorized.
 */
interface RouteTarget {
  /** Path param name holding the resource id, or null for collection routes. */
  param: string | null;
  /** Id used when `param` is null or the param is not present on the request. */
  defaultId: string;
  action: RegistrationAuthzAction;
}

/**
 * Exact (method, path) → target descriptor. Keys use the post-prefix,
 * trailing-slash-normalized path produced by {@link resolveRoutePattern} +
 * {@link stripPrefix}. HEAD is mapped to GET before lookup.
 */
const ROUTE_TABLE: Record<string, RouteTarget> = {
  "POST /documents/opd-slip.pdf": { param: null, defaultId: "partner-opd-slip", action: "registration.read" },
  "GET /dashboard/stats": { param: null, defaultId: "dashboard", action: "registration.read" },
  "GET /registrations": { param: null, defaultId: "list", action: "registration.read" },
  "GET /registrations/:registrationId": { param: "registrationId", defaultId: "detail", action: "registration.read" },
  "POST /visit-type-decision": { param: null, defaultId: "visit-type-decision", action: "registration.read" },
  "GET /visits": { param: null, defaultId: "visits-list", action: "registration.read" },
  "GET /visits/:visitId": { param: "visitId", defaultId: "visit-detail", action: "registration.read" },
  "POST /workflows/new-patient/registrations": { param: null, defaultId: "new", action: "registration.create" },
  "POST /workflows/opd-registrations/complete": { param: null, defaultId: "opd-complete", action: "registration.create" },
  "POST /workflows/existing-patient/registrations": { param: null, defaultId: "new-visit", action: "registration.create" },
  "POST /visits": { param: null, defaultId: "new-visit", action: "registration.create" },
  "PATCH /visits/:visitId": { param: "visitId", defaultId: "visit-update", action: "registration.update" },
  "DELETE /visits/:visitId": { param: "visitId", defaultId: "visit-delete", action: "registration.update" },
  "POST /visits/:visitId/status": { param: "visitId", defaultId: "visit-status", action: "registration.update_status" },
  "POST /visits/:visitId/complete": { param: "visitId", defaultId: "visit-complete", action: "registration.update" },
};

/**
 * The four OPD document routes share one target shape (read by
 * `registrationId`), so they are matched as a set rather than enumerated in
 * {@link ROUTE_TABLE}.
 */
const DOCUMENT_TARGET: RouteTarget = {
  param: "registrationId",
  defaultId: "registration-document",
  action: "registration.read",
};

function lookupRouteTarget(method: string, path: string): RouteTarget | null {
  if (method === "GET" && REGISTRATION_DOCUMENT_PATHS.has(path)) {
    return DOCUMENT_TARGET;
  }
  return ROUTE_TABLE[`${method} ${path}`] ?? null;
}

export function createRegistrationAuthzTargetResolver(): AuthzTargetResolver {
  return (request): AuthzTarget | null => {
    const path = stripPrefix(resolveRoutePattern(request));
    const method = request.method === "HEAD" ? "GET" : request.method;

    const route = lookupRouteTarget(method, path);
    if (route === null) return null;

    const id = route.param === null ? null : resolvePathParam(request, route.param);
    return readTarget(request as FastifyRequest, id ?? route.defaultId, route.action);
  };
}
