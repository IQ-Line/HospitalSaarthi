import { BoundedTtlCache } from "../util/bounded-ttl-cache.js";
import type {
  ModuleEntitlementRequestContext,
  TenantEntitlementResolverPort,
  TenantEntitlementResolution,
} from "../ports/module-integration-ports.js";
import {
  resolveTenantEntitledCapabilityKeys,
  type TenantEntitlementResolution as ResolvedEntitlement,
} from "../use-cases/resolve-tenant-entitled-capability-keys.js";
import type { ListAssignableRuntimeCapabilitiesDeps } from "../use-cases/list-assignable-runtime-capabilities.js";

const DEFAULT_CACHE_TTL_MS = 60_000;
const DEFAULT_MAX_CACHE_ENTRIES = 256;
const TENANT_ENTITLED_KEYS_CACHE_PREFIX = "tenant-entitled-cap-keys:";

export type CachedTenantEntitlementResolverOptions = {
  deps: ListAssignableRuntimeCapabilitiesDeps;
  cacheTtlMs?: number;
  maxCacheEntries?: number;
  log?: (event: Record<string, unknown>, message: string) => void;
  /** Called when entitlement cache is invalidated (e.g. bust Configurator module-id cache). */
  onInvalidateTenant?: (tenantId?: string) => void;
};

function tenantEntitlementCacheKey(tenantId: string): string {
  return `${TENANT_ENTITLED_KEYS_CACHE_PREFIX}${tenantId}`;
}

function isBypassCache(context?: ModuleEntitlementRequestContext): boolean {
  return context?.cachePolicy === "bypass-cache";
}

function cloneResolution(resolution: ResolvedEntitlement): TenantEntitlementResolution {
  return {
    entitledCapabilityKeys: new Set(resolution.entitledCapabilityKeys),
    tenantEntitlementRevision: resolution.tenantEntitlementRevision,
  };
}

/**
 * Per-tenant TTL cache over {@link resolveTenantEntitledCapabilityKeys}.
 */
export class CachedTenantEntitlementResolver implements TenantEntitlementResolverPort {
  private readonly deps: ListAssignableRuntimeCapabilitiesDeps;
  private readonly cache: BoundedTtlCache<TenantEntitlementResolution>;
  private readonly log?: CachedTenantEntitlementResolverOptions["log"];
  private readonly onInvalidateTenant?: CachedTenantEntitlementResolverOptions["onInvalidateTenant"];

  constructor(options: CachedTenantEntitlementResolverOptions) {
    this.deps = options.deps;
    this.onInvalidateTenant = options.onInvalidateTenant;
    this.log = options.log;
    this.cache = new BoundedTtlCache<TenantEntitlementResolution>({
      ttlMs: options.cacheTtlMs ?? DEFAULT_CACHE_TTL_MS,
      maxEntries: options.maxCacheEntries ?? DEFAULT_MAX_CACHE_ENTRIES,
      log: (event, message) =>
        options.log?.(
          { source: "tenant-entitlement", cache: event.outcome, cacheKey: event.key },
          message,
        ),
    });
  }

  invalidateTenantEntitlementCache(tenantId?: string): void {
    if (tenantId === undefined) {
      this.cache.invalidate();
    } else {
      this.cache.invalidate(tenantEntitlementCacheKey(tenantId));
    }
    this.onInvalidateTenant?.(tenantId);
    this.log?.(
      { tenantId: tenantId ?? "*", source: "tenant-entitlement" },
      "Tenant entitlement cache invalidated",
    );
  }

  async resolveTenantEntitlement(
    tenantId: string,
    context?: ModuleEntitlementRequestContext,
  ): Promise<TenantEntitlementResolution> {
    const cacheKey = tenantEntitlementCacheKey(tenantId);
    if (!isBypassCache(context)) {
      const cached = this.cache.get(cacheKey);
      if (cached !== undefined) {
        return cloneResolution(cached);
      }
    }

    const started = Date.now();
    const resolution = await resolveTenantEntitledCapabilityKeys(this.deps, tenantId, context);
    const result = cloneResolution(resolution);

    if (!isBypassCache(context)) {
      this.cache.set(cacheKey, result);
    }

    this.log?.(
      {
        tenantId,
        source: "tenant-entitlement",
        entitledKeyCount: result.entitledCapabilityKeys.size,
        cachePolicy: context?.cachePolicy ?? "use-cache",
        durationMs: Date.now() - started,
      },
      "Tenant entitled capability keys resolved",
    );

    return cloneResolution(result);
  }

  getCacheStats() {
    return this.cache.getStats();
  }
}

export function isRuntimeEntitlementIntersectionEnabled(): boolean {
  const raw = process.env.RUNTIME_ENTITLEMENT_INTERSECTION?.trim().toLowerCase();
  return !(raw === "false" || raw === "0" || raw === "no");
}
