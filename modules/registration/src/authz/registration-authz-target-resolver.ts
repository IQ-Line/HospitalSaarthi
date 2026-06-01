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

function visitReadTarget(request: FastifyRequest, id: string): AuthzTarget {
  return { kind: "registration", id, action: "registration.read", attr: tenantAttr(request) };
}

function visitWriteTarget(request: FastifyRequest, id: string, action: "registration.create" | "registration.update"): AuthzTarget {
  return { kind: "registration", id, action, attr: tenantAttr(request) };
}

export function createRegistrationAuthzTargetResolver(): AuthzTargetResolver {
  return (request): AuthzTarget | null => {
    const fullPath = resolveRoutePattern(request);
    const path = stripPrefix(fullPath);
    const method = request.method === "HEAD" ? "GET" : request.method;

    if (method === "GET" && path === "/registrations") {
      return visitReadTarget(request as FastifyRequest, "list");
    }

    if (method === "GET" && path === "/registrations/:registrationId") {
      const id = resolvePathParam(request, "registrationId");
      return visitReadTarget(request as FastifyRequest, id ?? "detail");
    }

    if (method === "GET" && path === "/visits") {
      return visitReadTarget(request as FastifyRequest, "visits-list");
    }

    if (method === "GET" && path === "/visits/:visitId") {
      const id = resolvePathParam(request, "visitId");
      return visitReadTarget(request as FastifyRequest, id ?? "visit-detail");
    }

    if (method === "POST" && path === "/workflows/new-patient/registrations") {
      return visitWriteTarget(request as FastifyRequest, "new", "registration.create");
    }

    if (method === "POST" && path === "/workflows/existing-patient/registrations") {
      return visitWriteTarget(request as FastifyRequest, "new-visit", "registration.create");
    }

    if (method === "POST" && path === "/visits") {
      return visitWriteTarget(request as FastifyRequest, "new-visit", "registration.create");
    }

    if (method === "PATCH" && path === "/visits/:visitId") {
      const id = resolvePathParam(request, "visitId");
      return visitWriteTarget(request as FastifyRequest, id ?? "visit-update", "registration.update");
    }

    if (method === "DELETE" && path === "/visits/:visitId") {
      const id = resolvePathParam(request, "visitId");
      return visitWriteTarget(request as FastifyRequest, id ?? "visit-delete", "registration.update");
    }

    if (method === "POST" && path === "/visits/:visitId/status") {
      const id = resolvePathParam(request, "visitId");
      return visitWriteTarget(request as FastifyRequest, id ?? "visit-status", "registration.update");
    }

    if (method === "POST" && path === "/visits/:visitId/complete") {
      const id = resolvePathParam(request, "visitId");
      return visitWriteTarget(request as FastifyRequest, id ?? "visit-complete", "registration.update");
    }

    return null;
  };
}
