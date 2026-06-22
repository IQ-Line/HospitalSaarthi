import { afterEach, describe, expect, it, vi } from "vitest";
import { HttpMasterDataModuleCatalogAdapter } from "../../../src/adapters/http-master-data-module-catalog-adapter.js";

describe("HttpMasterDataModuleCatalogAdapter", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("resolves slugs for requested module ids", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          data: [
            { id: "mod-a", slug: "visitpad" },
            { id: "mod-b", slug: "billing" },
          ],
          total: 2,
        }),
      }),
    );

    const adapter = new HttpMasterDataModuleCatalogAdapter({
      baseUrl: "http://localhost:8010",
    });

    const result = await adapter.resolveModuleSlugsByIds(["mod-a", "mod-b", "mod-missing"]);
    expect(result.get("mod-a")).toBe("visitpad");
    expect(result.get("mod-b")).toBe("billing");
    expect(result.has("mod-missing")).toBe(false);
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it("uses TTL cache on subsequent lookups", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          data: [{ id: "mod-a", slug: "visitpad" }],
          total: 1,
        }),
      }),
    );

    const adapter = new HttpMasterDataModuleCatalogAdapter({
      baseUrl: "http://localhost:8010",
      cacheTtlMs: 60_000,
    });

    await adapter.resolveModuleSlugsByIds(["mod-a"]);
    await adapter.resolveModuleSlugsByIds(["mod-a"]);
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it("throws MODULE_ENTITLEMENT_LOOKUP_FAILED on malformed payload", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => {
          throw new SyntaxError("Unexpected token");
        },
      }),
    );

    const adapter = new HttpMasterDataModuleCatalogAdapter({
      baseUrl: "http://localhost:8010",
    });

    await expect(adapter.resolveModuleSlugsByIds(["mod-a"])).rejects.toMatchObject({
      code: "MODULE_ENTITLEMENT_LOOKUP_FAILED",
      source: "master_data",
    });
  });

  it("maps duplicate normalized slugs so every catalog id resolves for entitlement", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          data: [
            { id: "mod-a", slug: "visitpad" },
            { id: "mod-b", slug: "VisitPad" },
          ],
        }),
      }),
    );

    const adapter = new HttpMasterDataModuleCatalogAdapter({
      baseUrl: "http://localhost:8010",
    });

    const result = await adapter.resolveModuleSlugsByIds(["mod-a", "mod-b"]);
    expect(result.get("mod-a")).toBe("visitpad");
    expect(result.get("mod-b")).toBe("visitpad");
  });

  it("expandEnabledModuleSlugs walks the catalog tree from Master Data", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          data: [
            { id: "l1-md", slug: "master-data", parent_id: null, level: 1 },
            { id: "l2-dep", slug: "departments", parent_id: "l1-md", level: 2 },
          ],
        }),
      }),
    );

    const adapter = new HttpMasterDataModuleCatalogAdapter({
      baseUrl: "http://localhost:8010",
    });

    const expanded = await adapter.expandEnabledModuleSlugs(["master-data"]);
    expect([...expanded].sort()).toEqual(["departments", "master-data"].sort());
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it("throws MODULE_ENTITLEMENT_LOOKUP_FAILED when Master Data returns non-OK", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        status: 503,
      }),
    );

    const adapter = new HttpMasterDataModuleCatalogAdapter({
      baseUrl: "http://localhost:8010",
    });

    await expect(adapter.resolveModuleSlugsByIds(["mod-a"])).rejects.toMatchObject({
      code: "MODULE_ENTITLEMENT_LOOKUP_FAILED",
      source: "master_data",
    });
  });
});
