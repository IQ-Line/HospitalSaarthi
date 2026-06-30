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

export function createRegistrationAuthzTargetResolver(): AuthzTargetResolver {
  return (request): AuthzTarget | null => {
    const fullPath = resolveRoutePattern(request);
    const path = stripPrefix(fullPath);
    const method = request.method === "HEAD" ? "GET" : request.method;
    const req = request as FastifyRequest;

    if (method === "GET" && REGISTRATION_DOCUMENT_PATHS.has(path)) {
      const id = resolvePathParam(request, "registrationId");
      return readTarget(req, id ?? "registration-document", "registration.read");
    }

    if (method === "POST" && path === "/documents/opd-slip.pdf") {
      return readTarget(req, "partner-opd-slip", "registration.read");
    }

    if (method === "GET" && path === "/dashboard/stats") {
      return readTarget(req, "dashboard", "registration.read");
    }

    if (method === "GET" && path === "/registrations") {
      return readTarget(req, "list", "registration.read");
    }

    if (method === "GET" && path === "/registrations/:registrationId") {
      const id = resolvePathParam(request, "registrationId");
      return readTarget(req, id ?? "detail", "registration.read");
    }

    if (method === "POST" && path === "/visit-type-decision") {
      return readTarget(req, "visit-type-decision", "registration.read");
    }

    if (method === "GET" && path === "/visits") {
      return readTarget(req, "visits-list", "registration.read");
    }

    if (method === "GET" && path === "/visits/:visitId") {
      const id = resolvePathParam(request, "visitId");
      return readTarget(req, id ?? "visit-detail", "registration.read");
    }

    if (method === "POST" && path === "/workflows/new-patient/registrations") {
      return readTarget(req, "new", "registration.create");
    }

    if (method === "POST" && path === "/workflows/opd-registrations/complete") {
      return readTarget(req, "opd-complete", "registration.create");
    }

    if (method === "POST" && path === "/workflows/existing-patient/registrations") {
      return readTarget(req, "new-visit", "registration.create");
    }

    if (method === "POST" && path === "/visits") {
      return readTarget(req, "new-visit", "registration.create");
    }

    if (method === "PATCH" && path === "/visits/:visitId") {
      const id = resolvePathParam(request, "visitId");
      return readTarget(req, id ?? "visit-update", "registration.update");
    }

    if (method === "DELETE" && path === "/visits/:visitId") {
      const id = resolvePathParam(request, "visitId");
      return readTarget(req, id ?? "visit-delete", "registration.update");
    }

    if (method === "POST" && path === "/visits/:visitId/status") {
      const id = resolvePathParam(request, "visitId");
      return readTarget(req, id ?? "visit-status", "registration.update_status");
    }

    if (method === "POST" && path === "/visits/:visitId/complete") {
      const id = resolvePathParam(request, "visitId");
      return readTarget(req, id ?? "visit-complete", "registration.update");
    }

    return null;
  };
}
