import { afterEach, describe, expect, it, vi } from "vitest";
import { HttpPlatformModuleCatalogClient } from "../../../src/adapters/http-platform-module-catalog-client.js";

const INTERNAL_URL = "http://localhost:8010/api/v1/master-data/internal/modules";

function stubFetch(impl: (...args: unknown[]) => Promise<unknown>) {
  const fn = vi.fn(impl);
  vi.stubGlobal("fetch", fn);
  return fn;
}

function ok(data: unknown) {
  return { ok: true, status: 200, json: async () => data };
}

function client() {
  return new HttpPlatformModuleCatalogClient({
    baseUrl: "http://localhost:8010",
    internalApiKey: "secret-key",
  });
}

describe("HttpPlatformModuleCatalogClient", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("returns valid (non-deleted) ids and drops deleted / id-less rows", async () => {
    stubFetch(async () =>
      ok({
        data: [
          { id: "a", is_deleted: false },
          { id: "b" }, // is_deleted absent → treated as live → valid
          { id: "c", is_deleted: true }, // soft-deleted → excluded (orphan)
          { id: null, is_deleted: false }, // no string id → excluded
          { is_deleted: false }, // no id → excluded
        ],
      }),
    );
    const ids = await client().listValidModuleIds();
    expect([...ids].sort()).toEqual(["a", "b"]);
  });

  it("calls the internal route with the shared-secret header", async () => {
    const fetchMock = stubFetch(async () => ok({ data: [] }));
    // Trailing slash on baseUrl must be normalized away.
    await new HttpPlatformModuleCatalogClient({
      baseUrl: "http://localhost:8010/",
      internalApiKey: "secret-key",
    }).listValidModuleIds();

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0] as [string, { headers: Record<string, string> }];
    expect(url).toBe(INTERNAL_URL);
    expect(init.headers["x-master-data-internal-key"]).toBe("secret-key");
  });

  it("fetches authoritatively on every call — no cache", async () => {
    const fetchMock = stubFetch(async () => ok({ data: [{ id: "a", is_deleted: false }] }));
    const c = client();
    await c.listValidModuleIds();
    await c.listValidModuleIds();
    // No cache: every call hits Master Data, so the deactivation it feeds is never stale.
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("throws on a non-2xx response — fails loud, never returns an empty set", async () => {
    stubFetch(async () => ({ ok: false, status: 503, json: async () => ({}) }));
    await expect(client().listValidModuleIds()).rejects.toThrow(/HTTP 503/);
  });

  it("throws on a malformed body (data not an array) — never masquerades as empty", async () => {
    stubFetch(async () => ok({ data: null }));
    await expect(client().listValidModuleIds()).rejects.toThrow(/missing `data` array/);
  });

  it("treats an empty data array as a legitimately-empty catalog (no throw)", async () => {
    stubFetch(async () => ok({ data: [] }));
    const ids = await client().listValidModuleIds();
    expect(ids.size).toBe(0);
  });
});
