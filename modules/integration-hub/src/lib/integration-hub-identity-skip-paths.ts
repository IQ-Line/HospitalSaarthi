/**
 * Full URL path prefixes for which integration-hub-svc skips JWT identity verification.
 * Must stay in sync with `services/integration-hub-svc/src/main.ts` identity plugin registration.
 *
 * Deliberately NARROW — health probes only. Everything platform-facing under
 * `/api/abdm/v1` (M1 ABHA, M2 linking, M3 consent/data, scan-share, AND bridge
 * discovery) requires a verified token. NHA gateway callbacks are NOT listed here
 * because they are mounted on the separate `/api/v3` scope that the identity plugin
 * never wraps; they authenticate via gateway signatures, not our JWT.
 *
 * `/docs` (swagger UI / OpenAPI JSON) is appended at the registration site in main.ts.
 */
export const INTEGRATION_HUB_IDENTITY_SKIP_PATH_PREFIXES = [
  /** K8s / load-balancer probes (no platform JWT). */
  "/healthz",
  "/api/abdm/v1/healthz",
] as const;

/**
 * Bridge-discovery routes. These now require a verified token (they are NOT in the
 * identity skip list) and always use deployment gateway credentials — never a
 * client-supplied `x-tenant-id`. The list is retained because the platform
 * integration-context resolver and the shared tenant plugin exempt these two paths
 * from the mandatory per-request tenant (they run on deployment credentials, so a
 * missing tenant must not 400).
 */
export const INTEGRATION_HUB_BRIDGE_DISCOVERY_PATHS = [
  "/api/abdm/v1/m0/bridge-services",
  "/api/abdm/v1/tenant/mapped-facility-ids",
] as const;

export function isBridgeDiscoveryPath(path: string): boolean {
  const normalized = path.split("?")[0] ?? "";
  return (INTEGRATION_HUB_BRIDGE_DISCOVERY_PATHS as readonly string[]).includes(normalized);
}
