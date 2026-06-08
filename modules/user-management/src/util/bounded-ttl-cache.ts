export type BoundedTtlCacheStats = {
  hits: number;
  misses: number;
  expirations: number;
  evictions: number;
};

export type BoundedTtlCacheLogEvent = {
  key: string;
  outcome: "hit" | "miss" | "expired" | "evicted";
};

export type BoundedTtlCacheOptions = {
  ttlMs: number;
  maxEntries: number;
  log?: (event: BoundedTtlCacheLogEvent, message: string) => void;
};

type Entry<T> = {
  value: T;
  expiresAt: number;
};

/**
 * Request-safe in-process TTL cache with bounded size (FIFO eviction when full).
 */
export class BoundedTtlCache<T> {
  private readonly store = new Map<string, Entry<T>>();
  private readonly stats: BoundedTtlCacheStats = {
    hits: 0,
    misses: 0,
    expirations: 0,
    evictions: 0,
  };

  constructor(private readonly options: BoundedTtlCacheOptions) {}

  get(key: string): T | undefined {
    const entry = this.store.get(key);
    if (entry === undefined) {
      this.stats.misses += 1;
      this.options.log?.({ key, outcome: "miss" }, "TTL cache miss");
      return undefined;
    }
    if (Date.now() >= entry.expiresAt) {
      this.store.delete(key);
      this.stats.expirations += 1;
      this.stats.misses += 1;
      this.options.log?.({ key, outcome: "expired" }, "TTL cache entry expired");
      return undefined;
    }
    this.stats.hits += 1;
    this.options.log?.({ key, outcome: "hit" }, "TTL cache hit");
    return entry.value;
  }

  set(key: string, value: T): void {
    if (this.store.size >= this.options.maxEntries && !this.store.has(key)) {
      const oldestKey = this.store.keys().next().value as string | undefined;
      if (oldestKey !== undefined) {
        this.store.delete(oldestKey);
        this.stats.evictions += 1;
        this.options.log?.({ key: oldestKey, outcome: "evicted" }, "TTL cache entry evicted");
      }
    }
    this.store.set(key, {
      value,
      expiresAt: Date.now() + this.options.ttlMs,
    });
  }

  invalidate(key?: string): void {
    if (key === undefined) {
      this.store.clear();
      return;
    }
    this.store.delete(key);
  }

  getStats(): BoundedTtlCacheStats {
    return { ...this.stats };
  }
}
