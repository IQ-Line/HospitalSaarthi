/**
 * Full URL path prefixes for which configurator-svc skips JWT identity verification.
 * Must stay in sync with `services/configurator-svc/src/main.ts` identity plugin registration.
 *
 * Internal S2S callers (no end-user bearer):
 * - integration-hub-svc → GET /integration-profiles/by-tenant|by-hip (x-configurator-internal-key)
 * - user-management-svc → GET /internal/tenants/:id/enabled-module-ids (x-um-internal-key)
 */
export const CONFIGURATOR_IDENTITY_SKIP_PATH_PREFIXES = [
  // Two explicit routes — a single `by-` prefix does not match `by-tenant`/`by-hip`
  // because identity skip logic requires `/` after the normalized prefix.
  "/api/configurator/v1/integration-profiles/by-tenant/",
  "/api/configurator/v1/integration-profiles/by-hip/",
  "/api/configurator/v1/internal/",
  "/api/configurator/v1/branding-logos/ready",
] as const;

/** Integration profile lookup routes used by integration-hub (M1 tenant deps + M2/M3 HIP callbacks). */
export const CONFIGURATOR_INTERNAL_INTEGRATION_PROFILE_PATHS = {
  byTenant: (tenantId: string) =>
    `/api/configurator/v1/integration-profiles/by-tenant/${encodeURIComponent(tenantId)}`,
  byHip: (hipId: string) =>
    `/api/configurator/v1/integration-profiles/by-hip/${encodeURIComponent(hipId)}`,
} as const;
