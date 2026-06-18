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

const PREFIX = "/api/empi/v1";

function stripPrefix(path: string): string {
  return path.startsWith(PREFIX) ? path.slice(PREFIX.length) || "/" : path;
}

type EmpiAuthzAction = "patient.read" | "patient.create" | "patient.update";

function readTarget(
  request: FastifyRequest,
  id: string,
  action: EmpiAuthzAction,
): AuthzTarget {
  return { kind: "empi_patient", id, action, attr: tenantAttr(request) };
}

export function createEmpiAuthzTargetResolver(): AuthzTargetResolver {
  return (request): AuthzTarget | null => {
    const fullPath = resolveRoutePattern(request);
    const path = stripPrefix(fullPath);
    const method = request.method === "HEAD" ? "GET" : request.method;
    const req = request as FastifyRequest;

    if (method === "GET" && path === "/patients") {
      return readTarget(req, "list", "patient.read");
    }

    if (method === "GET" && path === "/patients/find") {
      return readTarget(req, "find", "patient.read");
    }

    if (method === "POST" && path === "/patients/find-by-demographics") {
      return readTarget(req, "find-by-demographics", "patient.read");
    }

    if (method === "GET" && path === "/patients/:id") {
      const id = resolvePathParam(request, "id");
      return readTarget(req, id ?? "detail", "patient.read");
    }

    if (method === "POST" && path === "/patients") {
      return readTarget(req, "new", "patient.create");
    }

    if (method === "PATCH" && path === "/patients/:id") {
      const id = resolvePathParam(request, "id");
      return readTarget(req, id ?? "update", "patient.update");
    }

    if (method === "PATCH" && path === "/patients/:id/status") {
      const id = resolvePathParam(request, "id");
      return readTarget(req, id ?? "status", "patient.update");
    }

    if (method === "POST" && path === "/patients/:id/identifiers") {
      const id = resolvePathParam(request, "id");
      return readTarget(req, id ?? "link-identifier", "patient.update");
    }

    if (method === "DELETE" && path === "/patients/:id/identifiers/:identifierId") {
      const id = resolvePathParam(request, "identifierId");
      return readTarget(req, id ?? "unlink-identifier", "patient.update");
    }

    if (method === "POST" && path === "/patients/:id/addresses") {
      const id = resolvePathParam(request, "id");
      return readTarget(req, id ?? "create-address", "patient.update");
    }

    if (method === "PATCH" && path === "/patients/:id/addresses/:addressId") {
      const id = resolvePathParam(request, "addressId");
      return readTarget(req, id ?? "update-address", "patient.update");
    }

    return null;
  };
}
