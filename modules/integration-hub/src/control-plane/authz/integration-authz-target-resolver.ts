import type { AuthzTargetResolver } from "@hims/ts-sdk-authz";
import type { FastifyRequest } from "fastify";

const PREFIX = "/api/integration-hub/v1";

function resolveRoutePattern(request: Parameters<AuthzTargetResolver>[0]): string {
  const route = (request.routeOptions?.url ?? "") as string;
  const raw = route.length > 0 ? route : request.url;
  const path = raw.split("?")[0] ?? "";
  const normalized = path.length > 1 && path.endsWith("/") ? path.slice(0, -1) : path;
  return normalized.startsWith(PREFIX) ? normalized.slice(PREFIX.length) || "/" : normalized;
}

function tenantAttr(request: FastifyRequest): Record<string, unknown> {
  return { iq_tenant_id: request.tenantId };
}

export function createIntegrationAuthzTargetResolver(): AuthzTargetResolver {
  return (request): ReturnType<AuthzTargetResolver> => {
    const path = resolveRoutePattern(request);
    const method = request.method === "HEAD" ? "GET" : request.method;
    const req = request as FastifyRequest;

    if (method === "GET" && path === "/integration-types") {
      return { kind: "integration", id: "catalog", action: "integration.read", attr: tenantAttr(req) };
    }

    if (method === "GET" && path === "/integrations") {
      return { kind: "integration", id: "list", action: "integration.read", attr: tenantAttr(req) };
    }

    if (method === "POST" && path === "/integrations") {
      return { kind: "integration", id: "new", action: "integration.create", attr: tenantAttr(req) };
    }

    if (method === "GET" && path === "/integrations/:integrationId") {
      return {
        kind: "integration",
        id: request.params && typeof request.params === "object"
          ? String((request.params as { integrationId?: string }).integrationId ?? "detail")
          : "detail",
        action: "integration.read",
        attr: tenantAttr(req),
      };
    }

    if (method === "PATCH" && path === "/integrations/:integrationId") {
      return { kind: "integration", id: "update", action: "integration.update", attr: tenantAttr(req) };
    }

    if (method === "DELETE" && path === "/integrations/:integrationId") {
      return { kind: "integration", id: "delete", action: "integration.delete", attr: tenantAttr(req) };
    }

    if (method === "POST" && path === "/integrations/:integrationId/activate") {
      return { kind: "integration", id: "activate", action: "integration.activate", attr: tenantAttr(req) };
    }

    if (method === "POST" && path === "/integrations/:integrationId/disable") {
      return { kind: "integration", id: "disable", action: "integration.disable", attr: tenantAttr(req) };
    }

    if (method === "POST" && path === "/integrations/:integrationId/reactivate") {
      return {
        kind: "integration",
        id: "reactivate",
        action: "integration.reactivate",
        attr: tenantAttr(req),
      };
    }

    if (method === "GET" && path === "/integrations/:integrationId/api-keys") {
      return { kind: "integration_api_key", id: "list", action: "api_key.read", attr: tenantAttr(req) };
    }

    if (method === "POST" && path === "/integrations/:integrationId/api-keys") {
      return { kind: "integration_api_key", id: "issue", action: "api_key.issue", attr: tenantAttr(req) };
    }

    if (method === "POST" && path === "/integrations/:integrationId/api-keys/:apiKeyId/revoke") {
      return { kind: "integration_api_key", id: "revoke", action: "api_key.revoke", attr: tenantAttr(req) };
    }

    return null;
  };
}
