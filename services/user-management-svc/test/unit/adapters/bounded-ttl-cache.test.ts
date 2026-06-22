import { describe, expect, it, vi } from "vitest";
import { BoundedTtlCache } from "../../../src/adapters/bounded-ttl-cache.js";

describe("BoundedTtlCache", () => {
  it("tracks hits, misses, and expirations", () => {
    vi.useFakeTimers();
    const cache = new BoundedTtlCache<string>({ ttlMs: 1000, maxEntries: 4 });

    cache.set("a", "one");
    expect(cache.get("a")).toBe("one");
    expect(cache.get("missing")).toBeUndefined();

    vi.advanceTimersByTime(1001);
    expect(cache.get("a")).toBeUndefined();

    const stats = cache.getStats();
    expect(stats.hits).toBe(1);
    expect(stats.misses).toBe(2);
    expect(stats.expirations).toBe(1);

    vi.useRealTimers();
  });

  it("evicts oldest entry when max size exceeded", () => {
    const cache = new BoundedTtlCache<string>({ ttlMs: 60_000, maxEntries: 2 });
    cache.set("first", "1");
    cache.set("second", "2");
    cache.set("third", "3");

    expect(cache.get("first")).toBeUndefined();
    expect(cache.get("second")).toBe("2");
    expect(cache.getStats().evictions).toBe(1);
  });
});
