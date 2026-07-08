import { stripTrailingSlashes } from "../lib/strip-trailing-slashes.js";

const DEFAULT_TIMEOUT_MS = 2_000;

export type HttpUserManagementEntitlementCacheInvalidatorOptions = {
  baseUrl: string;
  internalApiKey: string;
  timeoutMs?: number;
  log?: (event: Record<string, unknown>, message: string) => void;
};

/**
 * Calls UM internal endpoint to bust tenant entitlement caches after Configurator module mutations.
 */
export class HttpUserManagementEntitlementCacheInvalidator {
  private readonly baseUrl: string;
  private readonly internalApiKey: string;
  private readonly timeoutMs: number;
  private readonly log?: HttpUserManagementEntitlementCacheInvalidatorOptions["log"];

  constructor(options: HttpUserManagementEntitlementCacheInvalidatorOptions) {
    this.baseUrl = stripTrailingSlashes(options.baseUrl);
    this.internalApiKey = options.internalApiKey;
    this.timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
    this.log = options.log;
  }

  async invalidateTenantEntitlementCache(tenantId: string): Promise<void> {
    const url = `${this.baseUrl}/api/user-management/internal/tenant-entitlement-cache/invalidate/${encodeURIComponent(tenantId)}`;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);
    try {
      const response = await fetch(url, {
        method: "POST",
        headers: {
          accept: "application/json",
          "x-um-internal-key": this.internalApiKey,
        },
        signal: controller.signal,
      });
      if (!response.ok) {
        this.log?.(
          { tenantId, status: response.status, source: "user-management" },
          "Tenant entitlement cache invalidation failed",
        );
        return;
      }
      this.log?.(
        { tenantId, source: "user-management" },
        "Tenant entitlement cache invalidated via HTTP",
      );
    } catch (err) {
      this.log?.(
        { tenantId, err, source: "user-management" },
        "Tenant entitlement cache invalidation request failed",
      );
    } finally {
      clearTimeout(timer);
    }
  }
}
