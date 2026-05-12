import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MasterDataPermissionsClient } from "./master-data-permissions-client.js";

const CATALOG = [
  { id: "p1", slug: "um:user:create" },
  { id: "p2", slug: "um:user:read" },
  { id: "p3", slug: "um:role:assign" },
];

describe("MasterDataPermissionsClient", () => {
  let fetchSpy: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    fetchSpy = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => CATALOG,
    });
    vi.stubGlobal("fetch", fetchSpy);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("fetches catalog and resolves known IDs to slugs", async () => {
    const client = new MasterDataPermissionsClient({ baseUrl: "http://md:3000" });

    const result = await client.getPermissionSlugsForIds(["p1", "p2"]);

    expect(result).toEqual(new Map([["p1", "um:user:create"], ["p2", "um:user:read"]]));
    expect(fetchSpy).toHaveBeenCalledTimes(1);
    expect(fetchSpy).toHaveBeenCalledWith("http://md:3000/permissions");
  });

  it("returns empty map for unknown IDs", async () => {
    const client = new MasterDataPermissionsClient({ baseUrl: "http://md:3000" });

    const result = await client.getPermissionSlugsForIds(["unknown-id"]);

    expect(result.size).toBe(0);
  });

  it("reuses cached catalog within TTL", async () => {
    const client = new MasterDataPermissionsClient({ baseUrl: "http://md:3000", ttlMs: 60_000 });

    await client.getPermissionSlugsForIds(["p1"]);
    await client.getPermissionSlugsForIds(["p2"]);
    await client.getPermissionSlugsForIds(["p3"]);

    expect(fetchSpy).toHaveBeenCalledTimes(1);
  });

  it("refreshes catalog after TTL expires", async () => {
    vi.useFakeTimers();
    const client = new MasterDataPermissionsClient({ baseUrl: "http://md:3000", ttlMs: 1000 });

    await client.getPermissionSlugsForIds(["p1"]);
    expect(fetchSpy).toHaveBeenCalledTimes(1);

    vi.advanceTimersByTime(1500);
    await client.getPermissionSlugsForIds(["p1"]);
    expect(fetchSpy).toHaveBeenCalledTimes(2);

    vi.useRealTimers();
  });

  it("returns empty map for empty input without fetching", async () => {
    const client = new MasterDataPermissionsClient({ baseUrl: "http://md:3000" });

    const result = await client.getPermissionSlugsForIds([]);

    expect(result.size).toBe(0);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("falls back to stale cache on fetch failure", async () => {
    vi.useFakeTimers();
    const client = new MasterDataPermissionsClient({ baseUrl: "http://md:3000", ttlMs: 100 });

    await client.getPermissionSlugsForIds(["p1"]);
    expect(fetchSpy).toHaveBeenCalledTimes(1);

    vi.advanceTimersByTime(200);
    fetchSpy.mockResolvedValueOnce({ ok: false, status: 500, statusText: "Internal Server Error" });
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    const result = await client.getPermissionSlugsForIds(["p1"]);

    expect(result.get("p1")).toBe("um:user:create");
    consoleSpy.mockRestore();
    vi.useRealTimers();
  });
});
