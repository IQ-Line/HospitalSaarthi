import { expandModuleSlugsWithDescendants } from "../domain/catalog-module-tree.js";
import { ModuleEntitlementLookupError } from "../domain/errors.js";
import {
  masterDataSourcePairKey,
  parseMasterDataSourcePairKey,
} from "../domain/master-data-source-pair.js";
import { normalizeModuleSlug } from "../domain/module-slug.js";
import {
  RUNTIME_AUTH_LIMITS,
  assertWithinLimit,
  dedupeTrimmedIds,
} from "../domain/runtime-authorization-limits.js";
import type { MasterDataModuleCatalogPort } from "../ports/module-integration-ports.js";
import { BoundedTtlCache } from "../util/bounded-ttl-cache.js";
import {
  fetchJsonWithResilience,
  type ClassifiedUpstreamError,
} from "./http-resilience.js";

const DEFAULT_TIMEOUT_MS = 5_000;
const DEFAULT_MAX_ATTEMPTS = 3;
/** Align with web `MODULE_CATALOG_STALE_MS` — long enough for steady dev; use `invalidateModuleSlugMapCache()` after MD edits. */
const DEFAULT_CACHE_TTL_MS = 5 * 60 * 1000;
const DEFAULT_MAX_CACHE_ENTRIES = 8;
const MODULE_SLUG_MAP_CACHE_KEY = "master-data-module-slug-map";
const MODULE_KIND_BY_SLUG_CACHE_KEY = "master-data-module-kind-by-slug";
const MODULE_TREE_CACHE_KEY = "master-data-module-tree";
const PERMISSION_SLUG_MAP_CACHE_KEY = "master-data-permission-slug-map";
const MODULE_PERMISSION_SOURCE_PAIRS_CACHE_KEY = "master-data-module-permission-source-pairs";
const MODULE_PERMISSION_PAGE_LIMIT = 200;

type ModuleRow = {
  id: string;
  slug: string;
  parent_id?: string | null;
  level?: number;
  module_kind?: string;
};

type ModuleListResponse = {
  data?: ModuleRow[];
};

type PermissionRow = {
  id: string;
  slug: string;
};

type PermissionListResponse = {
  data?: PermissionRow[];
  total?: number;
};

type ModulePermissionRow = {
  module_id: string;
  permission_id: string;
  is_active?: boolean;
  is_deleted?: boolean;
};

type ModulePermissionListResponse = {
  data?: ModulePermissionRow[];
  total?: number;
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
  private readonly moduleKindBySlugCache: BoundedTtlCache<Map<string, string>>;
  private readonly moduleTreeCache: BoundedTtlCache<ModuleRow[]>;
  private readonly permissionSlugByIdCache: BoundedTtlCache<Map<string, string>>;
  private readonly modulePermissionSourcePairsCache: BoundedTtlCache<Set<string>>;
  private readonly log?: HttpMasterDataModuleCatalogAdapterOptions["log"];

  constructor(options: HttpMasterDataModuleCatalogAdapterOptions) {
    this.baseUrl = trimTrailingSlash(options.baseUrl);
    this.timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
    this.maxAttempts = options.maxAttempts ?? DEFAULT_MAX_ATTEMPTS;
    const cacheOpts = {
      ttlMs: options.cacheTtlMs ?? DEFAULT_CACHE_TTL_MS,
      maxEntries: options.maxCacheEntries ?? DEFAULT_MAX_CACHE_ENTRIES,
      log: (event: { outcome: string; key: string }, message: string) =>
        options.log?.({ source: "master_data", cache: event.outcome, cacheKey: event.key }, message),
    };
    this.moduleSlugByIdCache = new BoundedTtlCache<Map<string, string>>(cacheOpts);
    this.moduleKindBySlugCache = new BoundedTtlCache<Map<string, string>>(cacheOpts);
    this.moduleTreeCache = new BoundedTtlCache<ModuleRow[]>(cacheOpts);
    this.permissionSlugByIdCache = new BoundedTtlCache<Map<string, string>>(cacheOpts);
    this.modulePermissionSourcePairsCache = new BoundedTtlCache<Set<string>>(cacheOpts);
    this.log = options.log;
  }

  invalidateModuleSlugMapCache(): void {
    this.moduleSlugByIdCache.invalidate(MODULE_SLUG_MAP_CACHE_KEY);
    this.moduleTreeCache.invalidate(MODULE_TREE_CACHE_KEY);
    this.permissionSlugByIdCache.invalidate(PERMISSION_SLUG_MAP_CACHE_KEY);
    this.modulePermissionSourcePairsCache.invalidate(MODULE_PERMISSION_SOURCE_PAIRS_CACHE_KEY);
  }

  async expandEnabledModuleSlugs(moduleSlugs: readonly string[]): Promise<readonly string[]> {
    const roots = dedupeTrimmedIds([...moduleSlugs]);
    if (roots.length === 0) {
      return [];
    }
    const tree = await this.loadModuleTree();
    return [...expandModuleSlugsWithDescendants(roots, tree)];
  }

  async listActiveModulePermissionSourcePairs(
    moduleSlugs: readonly string[],
  ): Promise<ReadonlySet<string>> {
    const normalizedRoots = dedupeTrimmedIds([...moduleSlugs]).map((slug) => normalizeModuleSlug(slug));
    if (normalizedRoots.length === 0) {
      return new Set();
    }

    const expanded = await this.expandEnabledModuleSlugs(normalizedRoots);
    const allowedModuleSlugs = new Set(expanded.map((slug) => normalizeModuleSlug(slug)));
    const allPairs = await this.loadModulePermissionSourcePairs();
    const filtered = new Set<string>();

    for (const pairKey of allPairs) {
      const parsed = parseMasterDataSourcePairKey(pairKey);
      if (parsed && allowedModuleSlugs.has(parsed.moduleSlug)) {
        filtered.add(pairKey);
      }
    }

    return filtered;
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

  async resolveModuleKindBySlugs(slugs: readonly string[]): Promise<Map<string, string>> {
    await this.ensureModuleCatalogLoaded();
    const kindBySlug = this.moduleKindBySlugCache.get(MODULE_KIND_BY_SLUG_CACHE_KEY) ?? new Map();
    const result = new Map<string, string>();
    for (const slug of slugs) {
      const normalized = normalizeModuleSlug(slug);
      const kind = kindBySlug.get(normalized);
      if (kind !== undefined) {
        result.set(normalized, kind);
      }
    }
    return result;
  }

  private async loadModuleTree(): Promise<ModuleRow[]> {
    await this.ensureModuleCatalogLoaded();
    return this.moduleTreeCache.get(MODULE_TREE_CACHE_KEY) ?? [];
  }

  private async loadModuleSlugMap(): Promise<Map<string, string>> {
    await this.ensureModuleCatalogLoaded();
    return this.moduleSlugByIdCache.get(MODULE_SLUG_MAP_CACHE_KEY) ?? new Map();
  }

  private async ensureModuleCatalogLoaded(): Promise<void> {
    if (
      this.moduleTreeCache.get(MODULE_TREE_CACHE_KEY) !== undefined &&
      this.moduleSlugByIdCache.get(MODULE_SLUG_MAP_CACHE_KEY) !== undefined
    ) {
      return;
    }

    const rows = await this.fetchModuleRows();
    const slugByModuleId = new Map<string, string>();
    const kindBySlug = new Map<string, string>();
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
      if (row.module_kind) {
        kindBySlug.set(normalized, row.module_kind);
      }
    }

    this.moduleTreeCache.set(MODULE_TREE_CACHE_KEY, rows);
    this.moduleSlugByIdCache.set(MODULE_SLUG_MAP_CACHE_KEY, slugByModuleId);
    this.moduleKindBySlugCache.set(MODULE_KIND_BY_SLUG_CACHE_KEY, kindBySlug);
    this.log?.(
      { source: "master_data", cache: "miss", moduleCount: slugByModuleId.size },
      "Master Data module slug map loaded",
    );
  }

  private async loadModulePermissionSourcePairs(): Promise<Set<string>> {
    const cached = this.modulePermissionSourcePairsCache.get(
      MODULE_PERMISSION_SOURCE_PAIRS_CACHE_KEY,
    );
    if (cached !== undefined) {
      return cached;
    }

    const [moduleSlugById, permissionSlugById, links] = await Promise.all([
      this.loadModuleSlugMap(),
      this.loadPermissionSlugMap(),
      this.fetchModulePermissionRows(),
    ]);

    const pairs = new Set<string>();
    for (const link of links) {
      if (link.is_deleted || link.is_active === false) {
        continue;
      }
      const moduleSlug = moduleSlugById.get(link.module_id);
      const permissionSlug = permissionSlugById.get(link.permission_id);
      if (moduleSlug === undefined || permissionSlug === undefined) {
        continue;
      }
      pairs.add(masterDataSourcePairKey(moduleSlug, permissionSlug));
    }

    this.modulePermissionSourcePairsCache.set(MODULE_PERMISSION_SOURCE_PAIRS_CACHE_KEY, pairs);
    return pairs;
  }

  private async loadPermissionSlugMap(): Promise<Map<string, string>> {
    const cached = this.permissionSlugByIdCache.get(PERMISSION_SLUG_MAP_CACHE_KEY);
    if (cached !== undefined) {
      return cached;
    }

    const rows = await this.fetchPermissionRows();
    const slugByPermissionId = new Map<string, string>();
    for (const row of rows) {
      if (typeof row.id !== "string" || typeof row.slug !== "string" || row.slug.length === 0) {
        continue;
      }
      slugByPermissionId.set(row.id, row.slug.trim().toLowerCase());
    }

    this.permissionSlugByIdCache.set(PERMISSION_SLUG_MAP_CACHE_KEY, slugByPermissionId);
    return slugByPermissionId;
  }

  private async fetchPermissionRows(): Promise<PermissionRow[]> {
    return this.fetchPaginatedRows<PermissionRow>("/api/v1/master-data/permissions");
  }

  private async fetchModulePermissionRows(): Promise<ModulePermissionRow[]> {
    return this.fetchPaginatedRows<ModulePermissionRow>(
      "/api/v1/master-data/module-permissions",
    );
  }

  private async fetchPaginatedRows<T extends Record<string, unknown>>(
    path: string,
  ): Promise<T[]> {
    const rows: T[] = [];
    let offset = 0;
    let total: number | undefined;

    while (true) {
      const url = `${this.baseUrl}${path}?limit=${MODULE_PERMISSION_PAGE_LIMIT}&offset=${offset}`;
      const body = await fetchJsonWithResilience<{ data?: T[]; total?: number }>({
        url,
        headers: { accept: "application/json" },
        timeoutMs: this.timeoutMs,
        maxAttempts: this.maxAttempts,
        source: "master_data",
        log: this.log,
      });

      const page = Array.isArray(body.data) ? body.data : [];
      rows.push(...page);
      total = typeof body.total === "number" ? body.total : undefined;

      offset += page.length;
      if (page.length === 0) {
        break;
      }
      if (total !== undefined && offset >= total) {
        break;
      }
      if (page.length < MODULE_PERMISSION_PAGE_LIMIT) {
        break;
      }
    }

    return rows;
  }

  private async fetchModuleRows(): Promise<ModuleRow[]> {
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

      return Array.isArray(body.data) ? body.data : [];
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
