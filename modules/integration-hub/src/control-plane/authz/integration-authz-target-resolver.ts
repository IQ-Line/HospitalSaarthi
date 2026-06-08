import type { AuthzTargetResolver } from "@hims/ts-sdk-authz";

const ROUTE_PREFIX = "/api/integration-hub/v1";

function normalizeUrl(url: string): string {
  const path = url.split("?")[0] ?? "";
  if (path.length > 1 && path.endsWith("/")) {
    return path.slice(0, -1);
  }
  return path;
}

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

export function createIntegrationAuthzTargetResolver(): AuthzTargetResolver {
  return async (request) => {
    const path = resolveRoutePattern(request);
    const method = request.method === "HEAD" ? "GET" : request.method;

    if (method === "GET" && path === "/integration-types") {
      return {
        kind: "integration",
        id: "catalog",
        action: "integration.read",
        attr: tenantAttr(request),
      };
    }

    if (method === "GET" && path === "/integrations") {
      return {
        kind: "integration",
        id: "list",
        action: "integration.read",
        attr: tenantAttr(request),
      };
    }

    if (method === "POST" && path === "/integrations") {
      return {
        kind: "integration",
        id: "new",
        action: "integration.create",
        attr: tenantAttr(request),
      };
    }

    if (method === "GET" && path === "/integrations/:integrationId") {
      const id = resolvePathParam(request, "integrationId");
      if (id === null) return null;
      return {
        kind: "integration",
        id,
        action: "integration.read",
        attr: tenantAttr(request),
      };
    }

    if (method === "PATCH" && path === "/integrations/:integrationId") {
      const id = resolvePathParam(request, "integrationId");
      if (id === null) return null;
      return {
        kind: "integration",
        id,
        action: "integration.update",
        attr: tenantAttr(request),
      };
    }

    if (method === "DELETE" && path === "/integrations/:integrationId") {
      const id = resolvePathParam(request, "integrationId");
      if (id === null) return null;
      return {
        kind: "integration",
        id,
        action: "integration.delete",
        attr: tenantAttr(request),
      };
    }

    if (method === "POST" && path === "/integrations/:integrationId/activate") {
      const id = resolvePathParam(request, "integrationId");
      if (id === null) return null;
      return {
        kind: "integration",
        id,
        action: "integration.activate",
        attr: tenantAttr(request),
      };
    }

    if (method === "POST" && path === "/integrations/:integrationId/disable") {
      const id = resolvePathParam(request, "integrationId");
      if (id === null) return null;
      return {
        kind: "integration",
        id,
        action: "integration.disable",
        attr: tenantAttr(request),
      };
    }

    if (method === "POST" && path === "/integrations/:integrationId/reactivate") {
      const id = resolvePathParam(request, "integrationId");
      if (id === null) return null;
      return {
        kind: "integration",
        id,
        action: "integration.reactivate",
        attr: tenantAttr(request),
      };
    }

    if (method === "GET" && path === "/integrations/:integrationId/api-keys") {
      const id = resolvePathParam(request, "integrationId");
      if (id === null) return null;
      return {
        kind: "integration_api_key",
        id: "list",
        action: "api_key.read",
        attr: tenantAttr(request),
      };
    }

    if (method === "POST" && path === "/integrations/:integrationId/api-keys") {
      const id = resolvePathParam(request, "integrationId");
      if (id === null) return null;
      return {
        kind: "integration_api_key",
        id: "new",
        action: "api_key.issue",
        attr: tenantAttr(request),
      };
    }

    if (
      method === "POST" &&
      path === "/integrations/:integrationId/api-keys/:apiKeyId/revoke"
    ) {
      const integrationId = resolvePathParam(request, "integrationId");
      const apiKeyId = resolvePathParam(request, "apiKeyId");
      if (integrationId === null || apiKeyId === null) return null;
      return {
        kind: "integration_api_key",
        id: apiKeyId,
        action: "api_key.revoke",
        attr: tenantAttr(request),
      };
    }

    return null;
  };
}
