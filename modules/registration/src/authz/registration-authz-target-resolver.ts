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

export function createRegistrationAuthzTargetResolver(): AuthzTargetResolver {
  return (request): AuthzTarget | null => {
    const fullPath = resolveRoutePattern(request);
    const path = stripPrefix(fullPath);
    const method = request.method === "HEAD" ? "GET" : request.method;

    if (method === "GET" && path === "/dashboard/stats") {
      return { kind: "registration", id: "dashboard", action: "registration.read", attr: tenantAttr(request as FastifyRequest) };
    }

    if (method === "GET" && path === "/registrations") {
      return { kind: "registration", id: "list", action: "registration.read", attr: tenantAttr(request as FastifyRequest) };
    }

    if (method === "GET" && path === "/registrations/:registrationId") {
      const id = resolvePathParam(request, "registrationId");
      return { kind: "registration", id: id ?? "detail", action: "registration.read", attr: tenantAttr(request as FastifyRequest) };
    }

    if (method === "POST" && path === "/workflows/new-patient/registrations") {
      return { kind: "registration", id: "new", action: "registration.create", attr: tenantAttr(request as FastifyRequest) };
    }

    if (method === "POST" && path === "/workflows/existing-patient/registrations") {
      return { kind: "registration", id: "new", action: "registration.create", attr: tenantAttr(request as FastifyRequest) };
    }

    if (method === "POST" && path === "/registrations/:registrationId/complete") {
      const id = resolvePathParam(request, "registrationId");
      return { kind: "registration", id: id ?? "complete", action: "registration.update", attr: tenantAttr(request as FastifyRequest) };
    }

    return null;
  };
}
