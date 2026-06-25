/**
 * Full URL path prefixes for which integration-hub-svc skips JWT identity verification.
 * Must stay in sync with `services/integration-hub-svc/src/main.ts` identity plugin registration.
 */
export const INTEGRATION_HUB_BRIDGE_DISCOVERY_PATHS = [
  "/api/abdm/v1/m0/bridge-services",
  "/api/abdm/v1/tenant/mapped-facility-ids",
] as const;

export const INTEGRATION_HUB_IDENTITY_SKIP_PATH_PREFIXES = [
  ...INTEGRATION_HUB_BRIDGE_DISCOVERY_PATHS,
  /** NHA inbound callbacks (no platform JWT). */
  "/api/v3",
] as const;

export function isBridgeDiscoveryPath(path: string): boolean {
  const normalized = path.split("?")[0] ?? "";
  return (INTEGRATION_HUB_BRIDGE_DISCOVERY_PATHS as readonly string[]).includes(normalized);
}
