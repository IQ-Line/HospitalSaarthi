import {
  ModuleEntitlementLookupError,
  RUNTIME_AUTH_LIMITS,
  assertWithinLimit,
  dedupeTrimmedIds,
  normalizeModuleSlug,
} from "@hims/user-management";
import type { MasterDataModuleCatalogPort } from "@hims/user-management";
import { BoundedTtlCache } from "./bounded-ttl-cache.js";
import {
  fetchJsonWithResilience,
  type ClassifiedUpstreamError,
} from "./http-resilience.js";

const DEFAULT_TIMEOUT_MS = 5_000;
const DEFAULT_MAX_ATTEMPTS = 3;
const DEFAULT_CACHE_TTL_MS = 60_000;
const DEFAULT_MAX_CACHE_ENTRIES = 8;
const MODULE_SLUG_MAP_CACHE_KEY = "master-data-module-slug-map";

type ModuleRow = {
  id: string;
  slug: string;
};

type ModuleListResponse = {
  data?: ModuleRow[];
};

export type HttpMasterDataModuleCatalogAdapterOptions = {
  baseUrl: string;
  timeoutMs?: number;
  maxAttempts?: number;
  cacheTtlMs?: number;
  maxCacheEntries?: number;
  log?: (event: Record<string, unknown>, message: string) => void;
};

function trimTrailingSlash(url: string): string {
  return url.replace(/\/+$/, "");
}

export class HttpMasterDataModuleCatalogAdapter implements MasterDataModuleCatalogPort {
  private readonly baseUrl: string;
  private readonly timeoutMs: number;
  private readonly maxAttempts: number;
  private readonly moduleSlugByIdCache: BoundedTtlCache<Map<string, string>>;
  private readonly log?: HttpMasterDataModuleCatalogAdapterOptions["log"];

  constructor(options: HttpMasterDataModuleCatalogAdapterOptions) {
    this.baseUrl = trimTrailingSlash(options.baseUrl);
    this.timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
    this.maxAttempts = options.maxAttempts ?? DEFAULT_MAX_ATTEMPTS;
    this.moduleSlugByIdCache = new BoundedTtlCache<Map<string, string>>({
      ttlMs: options.cacheTtlMs ?? DEFAULT_CACHE_TTL_MS,
      maxEntries: options.maxCacheEntries ?? DEFAULT_MAX_CACHE_ENTRIES,
      log: (event, message) =>
        options.log?.({ source: "master_data", cache: event.outcome, cacheKey: event.key }, message),
    });
    this.log = options.log;
  }

  invalidateModuleSlugMapCache(): void {
    this.moduleSlugByIdCache.invalidate(MODULE_SLUG_MAP_CACHE_KEY);
  }

  async resolveModuleSlugsByIds(moduleIds: string[]): Promise<Map<string, string>> {
    const uniqueIds = dedupeTrimmedIds(moduleIds);
    assertWithinLimit(
      uniqueIds.length,
      RUNTIME_AUTH_LIMITS.maxTenantModuleIdsToResolve,
      "tenant_module_ids_limit_exceeded",
    );

    if (uniqueIds.length === 0) {
      return new Map();
    }

    const slugByModuleId = await this.loadModuleSlugMap();
    const resolved = new Map<string, string>();
    for (const moduleId of uniqueIds) {
      const slug = slugByModuleId.get(moduleId);
      if (slug !== undefined) {
        resolved.set(moduleId, slug);
      }
    }
    return resolved;
  }

  private async loadModuleSlugMap(): Promise<Map<string, string>> {
    const cached = this.moduleSlugByIdCache.get(MODULE_SLUG_MAP_CACHE_KEY);
    if (cached !== undefined) {
      return cached;
    }

    const url = `${this.baseUrl}/api/v1/master-data/modules`;
    try {
      const body = await fetchJsonWithResilience<ModuleListResponse>({
        url,
        headers: { accept: "application/json" },
        timeoutMs: this.timeoutMs,
        maxAttempts: this.maxAttempts,
        source: "master_data",
        log: this.log,
      });

      const rows = Array.isArray(body.data) ? body.data : [];
      const slugByModuleId = new Map<string, string>();
      const normalizedSlugs = new Set<string>();
      for (const row of rows) {
        if (typeof row.id !== "string" || typeof row.slug !== "string" || row.slug.length === 0) {
          continue;
        }
        const normalized = normalizeModuleSlug(row.slug);
        if (normalizedSlugs.has(normalized)) {
          this.log?.(
            { source: "master_data", slug: normalized },
            "Master Data module catalog contains duplicate normalized slug; skipping row",
          );
          continue;
        }
        normalizedSlugs.add(normalized);
        slugByModuleId.set(row.id, normalized);
      }

      this.moduleSlugByIdCache.set(MODULE_SLUG_MAP_CACHE_KEY, slugByModuleId);
      this.log?.(
        { source: "master_data", cache: "miss", moduleCount: slugByModuleId.size },
        "Master Data module slug map loaded",
      );
      return slugByModuleId;
    } catch (err) {
      if (err instanceof ModuleEntitlementLookupError) {
        throw err;
      }
      const classified = err as ClassifiedUpstreamError;
      this.log?.(
        {
          source: "master_data",
          upstreamKind: classified.kind,
          status: classified.status,
          err: classified.cause,
        },
        "Master Data module catalog lookup failed",
      );
      throw new ModuleEntitlementLookupError("master_data", { cause: err });
    }
  }
}
