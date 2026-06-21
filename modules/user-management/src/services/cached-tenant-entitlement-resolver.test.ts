import { describe, expect, it, vi } from "vitest";
import { BoundedTtlCache } from "../util/bounded-ttl-cache.js";
import { CachedTenantEntitlementResolver } from "./cached-tenant-entitlement-resolver.js";
import type { Capability } from "../ports/index.js";

const umReadCap: Capability = {
  id: "c1",
  capability_key: "users:users:read",
  module: "users",
  feature: "users",
  action: "read",
  display_name: "Read users",
  is_active: true,
};

function createResolver() {
  let listCalls = 0;
  const resolver = new CachedTenantEntitlementResolver({
    deps: {
      capabilityRepository: {
        listActiveRuntimeCapabilitiesByModuleSlugs: async () => {
          listCalls += 1;
          return [umReadCap];
        },
      },
      tenantModuleEntitlementPort: {
        listTenantEnabledModuleIds: async () => ["mod-1"],
      },
      masterDataModuleCatalogPort: {
        resolveModuleSlugsByIds: async () => new Map([["mod-1", "user-management"]]),
        resolveModuleKindBySlugs: async () => new Map([["user-management", "platform"]]),
        expandEnabledModuleSlugs: async (slugs: readonly string[]) => [...slugs],
        listActiveModulePermissionSourcePairs: async () => new Set(),
      },
    },
    cacheTtlMs: 60_000,
    onInvalidateTenant: vi.fn(),
  });
  return { resolver, getListCalls: () => listCalls };
}

describe("CachedTenantEntitlementResolver", () => {
  it("caches entitled keys per tenant on repeated resolve", async () => {
    const { resolver, getListCalls } = createResolver();
    await resolver.resolveTenantEntitlement("tenant-1");
    await resolver.resolveTenantEntitlement("tenant-1");
    expect(getListCalls()).toBe(1);
  });

  it("refetches after invalidateTenantEntitlementCache", async () => {
    const { resolver, getListCalls } = createResolver();
    await resolver.resolveTenantEntitlement("tenant-1");
    resolver.invalidateTenantEntitlementCache("tenant-1");
    await resolver.resolveTenantEntitlement("tenant-1");
    expect(getListCalls()).toBe(2);
  });
});

describe("BoundedTtlCache", () => {
  it("expires entries after ttl", async () => {
    vi.useFakeTimers();
    const cache = new BoundedTtlCache<string>({ ttlMs: 1000, maxEntries: 4 });
    cache.set("k", "v");
    expect(cache.get("k")).toBe("v");
    vi.advanceTimersByTime(1001);
    expect(cache.get("k")).toBeUndefined();
    vi.useRealTimers();
  });
});
