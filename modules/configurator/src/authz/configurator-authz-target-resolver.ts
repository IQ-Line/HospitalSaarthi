import type { AuthzTargetResolver } from "@hims/ts-sdk-authz";

/**
 * Configurator PEP target resolver.
 *
 * Maps each `authMode:'protected'` route (post the `/api/configurator/v1` prefix) to a Cerbos
 * target `{kind, id, action, attr?}`. Configurator is a PLATFORM service: its policies gate on a
 * capability with NO tenant equality, so the resolved `id` does not affect the decision (it is
 * carried for auditability only) and no `iq_tenant_id` attr is attached. The single exception is
 * `tenant-onboarding`, which additionally carries `org_id` (from the request body) so the policy's
 * org-scoped self-service rule can compare it to `principal.attr.org_id`.
 *
 * The resolver reads method/path/params/body defensively — it must return a non-null target for the
 * onReady PROBE request (params = PROBE_UUID, no body) or boot fails ("AuthZ mapping incomplete").
 */

const ROUTE_PREFIX = "/api/configurator/v1";

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

type AuthzRequest = Parameters<AuthzTargetResolver>[0];
type AuthzTarget = Awaited<ReturnType<AuthzTargetResolver>>;
type RouteHandler = (request: AuthzRequest) => AuthzTarget;

/** Fixed-id route (list/create style): the Cerbos id is a stable literal, platform-scoped. */
function fixed(kind: string, id: string, action: string): RouteHandler {
  return () => ({ kind, id, action });
}

/** `:param` route: the Cerbos id is the resolved path param; null when absent (guard preserved). */
function pathId(kind: string, action: string, paramName: string): RouteHandler {
  return (request) => {
    const id = resolvePathParam(request, paramName);
    if (id === null) return null;
    return { kind, id, action };
  };
}

/**
 * Tenant onboarding: attaches `org_id` from the request body `organization.id` (optional) so the
 * policy's org-scoped self-service rule can match. Undefined on the probe (no body) → no attr,
 * still a non-null target. Conditional spread keeps `org_id` from ever serializing as undefined.
 */
const tenantOnboarding: RouteHandler = (request) => {
  const body = request.body as { organization?: { id?: unknown } } | undefined;
  const rawOrgId = body?.organization?.id;
  const orgId =
    typeof rawOrgId === "string" && rawOrgId.trim().length > 0 ? rawOrgId.trim() : undefined;
  return {
    kind: "configurator:tenant_onboarding",
    id: "__new__",
    action: "create",
    ...(orgId && { attr: { org_id: orgId } }),
  };
};

/**
 * Route table keyed by `${method} ${routePattern}`. HEAD is folded into GET before lookup.
 * Patterns are post-prefix (`/api/configurator/v1` stripped by resolveRoutePattern). Every entry
 * here MUST correspond to a route tagged `config:{authMode:'protected'}`, and vice versa.
 */
const ROUTE_TABLE: Record<string, RouteHandler> = {
  "POST /organizations": fixed("configurator:organization", "__new__", "create"),
  "GET /organizations": fixed("configurator:organization", "list", "read"),
  "GET /organizations/:id": pathId("configurator:organization", "read", "id"),
  "PATCH /organizations/:id": pathId("configurator:organization", "update", "id"),

  "POST /tenants": fixed("configurator:tenant", "__new__", "create"),
  "PATCH /tenants/:id": pathId("configurator:tenant", "update", "id"),

  "POST /tenants/:tenantId/modules": pathId("configurator:tenant_module", "create", "tenantId"),
  "GET /tenants/:tenantId/modules/:moduleId": pathId(
    "configurator:tenant_module",
    "read",
    "moduleId",
  ),
  "PATCH /tenants/:tenantId/modules/:moduleId": pathId(
    "configurator:tenant_module",
    "update",
    "moduleId",
  ),
  "DELETE /tenants/:tenantId/modules/:moduleId": pathId(
    "configurator:tenant_module",
    "delete",
    "moduleId",
  ),

  "GET /tenants/:tenantId/integration-profiles": pathId(
    "configurator:tenant_integration_profile",
    "read",
    "tenantId",
  ),
  "POST /tenants/:tenantId/integration-profiles": pathId(
    "configurator:tenant_integration_profile",
    "create",
    "tenantId",
  ),
  "GET /tenants/:tenantId/integration-profiles/:profileId": pathId(
    "configurator:tenant_integration_profile",
    "read",
    "profileId",
  ),
  "PATCH /tenants/:tenantId/integration-profiles/:profileId": pathId(
    "configurator:tenant_integration_profile",
    "update",
    "profileId",
  ),
  "DELETE /tenants/:tenantId/integration-profiles/:profileId": pathId(
    "configurator:tenant_integration_profile",
    "delete",
    "profileId",
  ),

  "GET /sequence-configurations": fixed("configurator:sequence_configuration", "list", "read"),
  "GET /tenants/:tenantId/sequence-configuration": pathId(
    "configurator:sequence_configuration",
    "read",
    "tenantId",
  ),
  "PUT /tenants/:tenantId/sequence-configuration/identifiers/:identifierType": pathId(
    "configurator:sequence_configuration",
    "update",
    "tenantId",
  ),

  "GET /tenants/:tenantId/api-keys": pathId("configurator:tenant_api_key", "read", "tenantId"),
  "POST /tenants/:tenantId/api-keys": pathId("configurator:tenant_api_key", "create", "tenantId"),
  "PATCH /tenants/:tenantId/api-keys/:apiKeyId": pathId(
    "configurator:tenant_api_key",
    "update",
    "apiKeyId",
  ),

  "POST /branding-logos/organization": fixed("configurator:branding", "organization", "create"),
  "POST /branding-logos/tenant": fixed("configurator:branding", "tenant", "create"),

  "POST /tenant-onboarding": tenantOnboarding,
};

export function createConfiguratorAuthzTargetResolver(): AuthzTargetResolver {
  return async (request) => {
    const path = resolveRoutePattern(request);
    const method = request.method === "HEAD" ? "GET" : request.method;
    const handler = ROUTE_TABLE[`${method} ${path}`];
    return handler ? handler(request) : null;
  };
}
