import { describe, expect, it, vi } from "vitest";
import { runtimeModuleKeyForCatalogSlug } from "../domain/capability-key.js";
import { ModuleEntitlementLookupError } from "../domain/errors.js";
import { PLATFORM_RUNTIME_MODULE_SLUGS } from "../domain/platform-module-slugs.js";
import type { Capability } from "../ports/index.js";
import { InMemoryCapabilityRepository } from "../data-access/in-memory-capability-repository.js";
import { listAssignableRuntimeCapabilities } from "./list-assignable-runtime-capabilities.js";

function capability(partial: Partial<Capability> & Pick<Capability, "id" | "module">): Capability {
  const feature = partial.feature ?? "core";
  const action = partial.action ?? "read";
  const moduleKey = runtimeModuleKeyForCatalogSlug(partial.module);
  return {
    capability_key: partial.capability_key ?? `${moduleKey}:${feature}:${action}`,
    feature,
    action,
    display_name: partial.display_name ?? `${partial.module} ${action}`,
    is_active: partial.is_active ?? true,
    ...partial,
  };
}

describe("listAssignableRuntimeCapabilities", () => {
  it("returns runtime capabilities for tenant-enabled module slugs plus platform slugs", async () => {
    const visitpadModuleId = "11111111-1111-4111-8111-111111111111";
    const capabilityRepository = new InMemoryCapabilityRepository(
      [
        capability({ id: "cap-um", module: "user-management" }),
        capability({ id: "cap-cfg", module: "configurator" }),
        capability({ id: "cap-vp", module: "visitpad" }),
        capability({ id: "cap-billing", module: "billing", is_active: false }),
        capability({ id: "cap-other", module: "empi" }),
      ].map((c) => ({ capability: c })),
    );

    const result = await listAssignableRuntimeCapabilities(
      {
        capabilityRepository,
        tenantModuleEntitlementPort: {
          listTenantEnabledModuleIds: vi.fn().mockResolvedValue([visitpadModuleId]),
        },
        masterDataModuleCatalogPort: {
          resolveModuleSlugsByIds: vi
            .fn()
            .mockResolvedValue(new Map([[visitpadModuleId, "visitpad"]])),
        },
      },
      "tenant-a",
    );

    expect(result.map((c) => c.id).sort()).toEqual(["cap-cfg", "cap-um", "cap-vp"].sort());
    for (const slug of PLATFORM_RUNTIME_MODULE_SLUGS) {
      expect(result.some((c) => c.module === slug)).toBe(true);
    }
  });

  it("returns only platform assignable modules when tenant has no enabled modules", async () => {
    const capabilityRepository = new InMemoryCapabilityRepository(
      [
        capability({ id: "cap-um", module: "user-management" }),
        capability({ id: "cap-cfg", module: "configurator" }),
        capability({ id: "cap-vp", module: "visitpad" }),
      ].map((c) => ({ capability: c })),
    );

    const result = await listAssignableRuntimeCapabilities(
      {
        capabilityRepository,
        tenantModuleEntitlementPort: {
          listTenantEnabledModuleIds: vi.fn().mockResolvedValue([]),
        },
        masterDataModuleCatalogPort: {
          resolveModuleSlugsByIds: vi.fn().mockResolvedValue(new Map()),
        },
      },
      "tenant-a",
    );

    expect(result.map((c) => c.module).sort()).toEqual(
      [...PLATFORM_RUNTIME_MODULE_SLUGS].sort(),
    );
    expect(result.some((c) => c.module === "visitpad")).toBe(false);
  });

  it("returns opd and user-management groups when both enabled", async () => {
    const opdModuleId = "22222222-2222-4222-8222-222222222222";
    const capabilityRepository = new InMemoryCapabilityRepository(
      [
        capability({ id: "cap-um", module: "user-management" }),
        capability({ id: "cap-opd", module: "opd" }),
        capability({ id: "cap-billing", module: "billing" }),
      ].map((c) => ({ capability: c })),
    );

    const result = await listAssignableRuntimeCapabilities(
      {
        capabilityRepository,
        tenantModuleEntitlementPort: {
          listTenantEnabledModuleIds: vi.fn().mockResolvedValue([opdModuleId]),
        },
        masterDataModuleCatalogPort: {
          resolveModuleSlugsByIds: vi.fn().mockResolvedValue(new Map([[opdModuleId, "opd"]])),
        },
      },
      "tenant-a",
    );

    expect(result.map((c) => c.id).sort()).toEqual(["cap-opd", "cap-um"].sort());
    expect(result.some((c) => c.module === "billing")).toBe(false);
  });

  it("fails closed when Master Data returns no slug for a tenant-enabled module id", async () => {
    const visitpadModuleId = "11111111-1111-4111-8111-111111111111";
    const capabilityRepository = new InMemoryCapabilityRepository(
      [capability({ id: "cap-vp", module: "visitpad" })].map((c) => ({ capability: c })),
    );

    await expect(
      listAssignableRuntimeCapabilities(
        {
          capabilityRepository,
          tenantModuleEntitlementPort: {
            listTenantEnabledModuleIds: vi.fn().mockResolvedValue([visitpadModuleId]),
          },
          masterDataModuleCatalogPort: {
            resolveModuleSlugsByIds: vi.fn().mockResolvedValue(new Map()),
          },
        },
        "tenant-a",
      ),
    ).rejects.toBeInstanceOf(ModuleEntitlementLookupError);
  });

  it("fails closed when Master Data returns a non-kebab-case slug", async () => {
    const capabilityRepository = new InMemoryCapabilityRepository(
      [capability({ id: "cap-um", module: "user-management" })].map((c) => ({ capability: c })),
    );

    await expect(
      listAssignableRuntimeCapabilities(
        {
          capabilityRepository,
          tenantModuleEntitlementPort: {
            listTenantEnabledModuleIds: vi.fn().mockResolvedValue(["mod-bad"]),
          },
          masterDataModuleCatalogPort: {
            resolveModuleSlugsByIds: vi.fn().mockResolvedValue(new Map([["mod-bad", "Invalid_Slug"]])),
          },
        },
        "tenant-a",
      ),
    ).rejects.toBeInstanceOf(ModuleEntitlementLookupError);
  });

  it("propagates configurator lookup failures (fail closed)", async () => {
    const capabilityRepository = new InMemoryCapabilityRepository(
      [capability({ id: "cap-um", module: "user-management" })].map((c) => ({ capability: c })),
    );

    await expect(
      listAssignableRuntimeCapabilities(
        {
          capabilityRepository,
          tenantModuleEntitlementPort: {
            listTenantEnabledModuleIds: vi
              .fn()
              .mockRejectedValue(new ModuleEntitlementLookupError("configurator")),
          },
          masterDataModuleCatalogPort: {
            resolveModuleSlugsByIds: vi.fn(),
          },
        },
        "tenant-a",
      ),
    ).rejects.toBeInstanceOf(ModuleEntitlementLookupError);
  });
});
