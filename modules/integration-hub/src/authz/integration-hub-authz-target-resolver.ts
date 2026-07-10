import type { AuthzTargetResolver, AuthzTarget } from "@hims/ts-sdk-authz";
import type { FastifyRequest } from "fastify";

/**
 * AuthzTarget resolver for the USER-FACING ABDM platform routes (M2 care-context
 * linking + M3 HIU consent / health-data). These are JWT-authenticated,
 * user-initiated operations that touch consent and PHI, so each is capability-gated
 * by the shared Cerbos PEP (`@hims/ts-sdk-authz` authzPlugin).
 *
 * SCOPE: this resolver ONLY maps the routes registered inside the gated child scope
 * (M2 platform + M3 platform). M0 discovery, M1 ABHA enrol/login, scan-share, and the
 * NHA gateway callbacks (`/api/v3/*`) are NOT gated here — they are authenticated by
 * identity (M0/M1/scan-share) or gateway signatures (callbacks) and never reach this
 * resolver. Every route flagged `config.authMode === "protected"` MUST appear in
 * {@link ROUTE_TABLE}; the authzPlugin onReady probe fails boot otherwise (fail-closed).
 */

const PREFIX = "/api/abdm/v1";

/** Single Cerbos resource kind; the action segment carries the feature (care-context / consent / health-data). */
const RESOURCE_KIND = "abdm";

type AbdmAuthzAction =
  | "care-context.create"
  | "care-context.read"
  | "consent.create"
  | "consent.read"
  | "health-data.create"
  | "health-data.read";

function resolveRoutePattern(request: Parameters<AuthzTargetResolver>[0]): string {
  const route = (request.routeOptions?.url ?? "") as string;
  const raw = route.length > 0 ? route : request.url;
  const path = raw.split("?")[0] ?? "";
  return path.length > 1 && path.endsWith("/") ? path.slice(0, -1) : path;
}

function stripPrefix(path: string): string {
  return path.startsWith(PREFIX) ? path.slice(PREFIX.length) || "/" : path;
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

function tenantAttr(request: FastifyRequest): AuthzTarget["attr"] {
  return { iq_tenant_id: request.tenantId };
}

/**
 * Describes how to build an {@link AuthzTarget} for one exact (method, path) route:
 * which path param (if any) carries the resource id, the id to fall back to when that
 * param is absent, and the action being authorized.
 */
interface RouteTarget {
  /** Path param name holding the resource id, or null for collection/action routes. */
  param: string | null;
  /** Id used when `param` is null or the param is not present on the request. */
  defaultId: string;
  action: AbdmAuthzAction;
}

/**
 * Exact (method, path) → target descriptor. Keys use the post-prefix,
 * trailing-slash-normalized path produced by {@link resolveRoutePattern} +
 * {@link stripPrefix}. HEAD is mapped to GET before lookup.
 *
 * Mapping rationale:
 *  - M2 (care-context linking): mutations (acquire token / initiate link / publish
 *    contexts / orchestrate / notify) are `care-context.create`; status reads are
 *    `care-context.read`.
 *  - M3 (HIU consent): starting a consent request is `consent.create`; searching /
 *    reading consent-request status is `consent.read`.
 *  - M3 (health data / PHI): initiating a data-request is `health-data.create`;
 *    reading transferred records / bundles / attachments (the actual PHI) is
 *    `health-data.read`.
 */
const ROUTE_TABLE: Record<string, RouteTarget> = {
  // ---- M2: care-context linking (HIP side) ----
  "POST /m2/link-token/acquire": { param: null, defaultId: "link-token-acquire", action: "care-context.create" },
  "GET /m2/link-token/status": { param: null, defaultId: "link-token-status", action: "care-context.read" },
  "GET /m2/sessions/:sessionId": { param: "sessionId", defaultId: "session", action: "care-context.read" },
  "POST /m2/hip/initiated-link/start": { param: null, defaultId: "hip-initiated-link-start", action: "care-context.create" },
  "POST /m2/orchestrate/after-care-contexts": { param: null, defaultId: "orchestrate-after-care-contexts", action: "care-context.create" },
  "POST /m2/add-contexts/publish": { param: null, defaultId: "add-contexts-publish", action: "care-context.create" },
  "POST /m2/sms/notify": { param: null, defaultId: "sms-notify", action: "care-context.create" },

  // ---- M3: HIU consent ----
  "GET /m3/hiu/consent/requests": { param: null, defaultId: "consent-requests", action: "consent.read" },
  "POST /m3/hiu/consent/request": { param: null, defaultId: "consent-request", action: "consent.create" },
  "GET /m3/hiu/consent/request/:sessionId": { param: "sessionId", defaultId: "consent-request", action: "consent.read" },

  // ---- M3: health data / PHI ----
  "GET /m3/hiu/consent/request/:sessionId/records": { param: "sessionId", defaultId: "consent-records", action: "health-data.read" },
  "POST /m3/hiu/data-request": { param: null, defaultId: "data-request", action: "health-data.create" },
  "GET /m3/hiu/transfers/:transferId": { param: "transferId", defaultId: "transfer", action: "health-data.read" },
  "GET /m3/hiu/attachment/:sessionId/:bundleId/:num": { param: "sessionId", defaultId: "attachment", action: "health-data.read" },
};

function lookupRouteTarget(method: string, path: string): RouteTarget | null {
  return ROUTE_TABLE[`${method} ${path}`] ?? null;
}

export function createIntegrationHubAuthzTargetResolver(): AuthzTargetResolver {
  return (request): AuthzTarget | null => {
    const path = stripPrefix(resolveRoutePattern(request));
    const method = request.method === "HEAD" ? "GET" : request.method;

    const route = lookupRouteTarget(method, path);
    if (route === null) return null;

    const id = route.param === null ? null : resolvePathParam(request, route.param);
    return {
      kind: RESOURCE_KIND,
      id: id ?? route.defaultId,
      action: route.action,
      attr: tenantAttr(request as FastifyRequest),
    };
  };
}
