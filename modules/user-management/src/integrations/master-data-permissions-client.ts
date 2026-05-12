import type { MasterDataPermissionsPort } from "../ports/master-data-permissions.port.js";

const DEFAULT_TTL_MS = 5 * 60 * 1000;

type CacheEntry = {
  map: Map<string, string>;
  expiresAt: number;
};

export type MasterDataPermissionsClientOptions = {
  baseUrl: string;
  /** Cache TTL in milliseconds. Defaults to 5 minutes. */
  ttlMs?: number;
};

/**
 * HTTP-based Master Data permission catalog client with lazy-loaded TTL cache.
 *
 * Master Data owns the permission catalog; UM only stores permission UUIDs. This client
 * fetches the full catalog (`GET /permissions`) once, caches it in process memory for the
 * TTL window (default 5 min), and resolves individual UUIDs from RAM on subsequent calls.
 *
 * Cache strategy:
 * - Lazy: first `getPermissionSlugsForIds` call triggers the fetch.
 * - TTL: after expiry, the next call re-fetches.
 * - Inflight dedup: concurrent callers share one in-flight Promise (no thundering herd).
 * - Graceful degradation: on fetch failure, returns stale cache (if any) + logs error.
 */
export class MasterDataPermissionsClient implements MasterDataPermissionsPort {
  private readonly baseUrl: string;
  private readonly ttlMs: number;
  private cache: CacheEntry | null = null;
  private inflightFetch: Promise<Map<string, string>> | null = null;

  constructor(options: MasterDataPermissionsClientOptions) {
    this.baseUrl = options.baseUrl.replace(/\/+$/, "");
    this.ttlMs = options.ttlMs ?? DEFAULT_TTL_MS;
  }

  async getPermissionSlugsForIds(ids: string[]): Promise<Map<string, string>> {
    if (ids.length === 0) return new Map();

    const catalog = await this.getCatalog();
    const result = new Map<string, string>();
    for (const id of ids) {
      const slug = catalog.get(id);
      if (slug !== undefined) result.set(id, slug);
    }
    return result;
  }

  private async getCatalog(): Promise<Map<string, string>> {
    if (this.cache !== null && Date.now() < this.cache.expiresAt) {
      return this.cache.map;
    }

    if (this.inflightFetch !== null) return this.inflightFetch;

    this.inflightFetch = this.fetchCatalog();
    try {
      const map = await this.inflightFetch;
      this.cache = { map, expiresAt: Date.now() + this.ttlMs };
      return map;
    } finally {
      this.inflightFetch = null;
    }
  }

  private async fetchCatalog(): Promise<Map<string, string>> {
    const url = `${this.baseUrl}/permissions`;
    const res = await fetch(url);

    if (!res.ok) {
      console.error(
        `[master-data-permissions] Failed to fetch permission catalog: ${res.status} ${res.statusText}`,
      );
      return this.cache?.map ?? new Map();
    }

    const body: unknown = await res.json();

    if (!Array.isArray(body)) {
      console.error(
        "[master-data-permissions] Unexpected response shape: expected array of { id, slug }",
      );
      return this.cache?.map ?? new Map();
    }

    const map = new Map<string, string>();
    for (const entry of body) {
      if (
        entry !== null &&
        typeof entry === "object" &&
        typeof (entry as Record<string, unknown>).id === "string" &&
        typeof (entry as Record<string, unknown>).slug === "string"
      ) {
        map.set(
          (entry as Record<string, string>).id,
          (entry as Record<string, string>).slug,
        );
      }
    }
    return map;
  }
}
