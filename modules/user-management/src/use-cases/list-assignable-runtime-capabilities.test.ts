import { describe, expect, it, vi } from "vitest";
import { expandModuleSlugsWithDescendants } from "../domain/catalog-module-tree.js";
import { runtimeModuleKeyForCatalogSlug } from "../domain/capability-key.js";
import { ModuleEntitlementLookupError } from "../domain/errors.js";
import { masterDataSourcePairKey } from "../domain/master-data-source-pair.js";
import { PLATFORM_RUNTIME_MODULE_SLUGS } from "../domain/platform-module-slugs.js";
import type { Capability } from "../ports/index.js";
import { InMemoryCapabilityRepository } from "../data-access/in-memory-capability-repository.js";
import { createMasterDataModuleCatalogPortStub } from "../test-support/master-data-catalog-port-stub.js";
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
        capability({
          id: "cap-vp",
          module: "visitpad",
          source_catalog: "master_data",
          source_module_slug: "visitpad",
          source_permission_slug: "read",
        }),
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
        masterDataModuleCatalogPort: createMasterDataModuleCatalogPortStub({
          resolveModuleSlugsByIds: vi
            .fn()
            .mockResolvedValue(new Map([[visitpadModuleId, "visitpad"]])),
        }),
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
        capability({
          id: "cap-vp",
          module: "visitpad",
          source_catalog: "master_data",
          source_module_slug: "visitpad",
          source_permission_slug: "read",
        }),
      ].map((c) => ({ capability: c })),
    );

    const result = await listAssignableRuntimeCapabilities(
      {
        capabilityRepository,
        tenantModuleEntitlementPort: {
          listTenantEnabledModuleIds: vi.fn().mockResolvedValue([]),
        },
        masterDataModuleCatalogPort: createMasterDataModuleCatalogPortStub(),
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
        capability({
          id: "cap-opd",
          module: "opd",
          source_catalog: "master_data",
          source_module_slug: "opd",
          source_permission_slug: "visit.read",
        }),
        capability({ id: "cap-billing", module: "billing" }),
      ].map((c) => ({ capability: c })),
    );

    const result = await listAssignableRuntimeCapabilities(
      {
        capabilityRepository,
        tenantModuleEntitlementPort: {
          listTenantEnabledModuleIds: vi.fn().mockResolvedValue([opdModuleId]),
        },
        masterDataModuleCatalogPort: createMasterDataModuleCatalogPortStub({
          resolveModuleSlugsByIds: vi.fn().mockResolvedValue(new Map([[opdModuleId, "opd"]])),
        }),
      },
      "tenant-a",
    );

    expect(result.map((c) => c.id).sort()).toEqual(["cap-opd", "cap-um"].sort());
    expect(result.some((c) => c.module === "billing")).toBe(false);
  });

  it("includes capabilities on descendant catalog modules when expansion is applied", async () => {
    const catalogTree = [
      { id: "l1-md", slug: "master-data", parent_id: null, level: 1 },
      { id: "l2-dep", slug: "departments", parent_id: "l1-md", level: 2 },
    ];
    const masterDataModuleId = "l1-md";
    const capabilityRepository = new InMemoryCapabilityRepository(
      [
        capability({
          id: "cap-md",
          module: "master-data",
          source_catalog: "master_data",
          source_module_slug: "master-data",
          source_permission_slug: "read",
        }),
        capability({
          id: "cap-dep",
          module: "departments",
          source_catalog: "master_data",
          source_module_slug: "departments",
          source_permission_slug: "read",
        }),
      ].map((c) => ({ capability: c })),
    );

    const result = await listAssignableRuntimeCapabilities(
      {
        capabilityRepository,
        tenantModuleEntitlementPort: {
          listTenantEnabledModuleIds: vi.fn().mockResolvedValue([masterDataModuleId]),
        },
        masterDataModuleCatalogPort: createMasterDataModuleCatalogPortStub({
          resolveModuleSlugsByIds: vi
            .fn()
            .mockResolvedValue(new Map([[masterDataModuleId, "master-data"]])),
          expandEnabledModuleSlugs: vi.fn(async (slugs) => [
            ...expandModuleSlugsWithDescendants(slugs, catalogTree),
          ]),
        }),
      },
      "tenant-a",
    );

    expect(result.map((c) => c.id).sort()).toEqual(["cap-dep", "cap-md"]);
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
          masterDataModuleCatalogPort: createMasterDataModuleCatalogPortStub(),
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
          masterDataModuleCatalogPort: createMasterDataModuleCatalogPortStub({
            resolveModuleSlugsByIds: vi.fn().mockResolvedValue(new Map([["mod-bad", "Invalid_Slug"]])),
          }),
        },
        "tenant-a",
      ),
    ).rejects.toBeInstanceOf(ModuleEntitlementLookupError);
  });

  it("omits LOB capabilities when the Master Data module-permission link was removed", async () => {
    const billingModuleId = "33333333-3333-4333-8333-333333333333";
    const capabilityRepository = new InMemoryCapabilityRepository(
      [
        capability({
          id: "cap-tariff-create",
          module: "tariff-master",
          capability_key: "tariff-master:tariff-master:create",
          action: "create",
          source_catalog: "master_data",
          source_module_slug: "tariff-master",
          source_permission_slug: "create",
        }),
        capability({
          id: "cap-tariff-read",
          module: "tariff-master",
          capability_key: "tariff-master:tariff-master:read",
          source_catalog: "master_data",
          source_module_slug: "tariff-master",
          source_permission_slug: "read",
        }),
      ].map((c) => ({ capability: c })),
    );

    const result = await listAssignableRuntimeCapabilities(
      {
        capabilityRepository,
        tenantModuleEntitlementPort: {
          listTenantEnabledModuleIds: vi.fn().mockResolvedValue([billingModuleId]),
        },
        masterDataModuleCatalogPort: createMasterDataModuleCatalogPortStub({
          resolveModuleSlugsByIds: vi
            .fn()
            .mockResolvedValue(new Map([[billingModuleId, "billing-and-finance"]])),
          expandEnabledModuleSlugs: vi.fn(async (slugs) => [...slugs, "tariff-master"]),
          listActiveModulePermissionSourcePairs: vi.fn(
            async () =>
              new Set([masterDataSourcePairKey("tariff-master", "read")]),
          ),
        }),
      },
      "tenant-a",
    );

    expect(result.map((capability) => capability.id)).toEqual(["cap-tariff-read"]);
  });

  it("excludes platform module capabilities when productOnly is true", async () => {
    const visitpadModuleId = "11111111-1111-4111-8111-111111111111";
    const capabilityRepository = new InMemoryCapabilityRepository(
      [
        capability({ id: "cap-um", module: "user-management" }),
        capability({ id: "cap-cfg", module: "configurator" }),
        capability({
          id: "cap-vp",
          module: "visitpad",
          source_catalog: "master_data",
          source_module_slug: "visitpad",
          source_permission_slug: "read",
        }),
      ].map((c) => ({ capability: c })),
    );

    const result = await listAssignableRuntimeCapabilities(
      {
        capabilityRepository,
        tenantModuleEntitlementPort: {
          listTenantEnabledModuleIds: vi.fn().mockResolvedValue([visitpadModuleId]),
        },
        masterDataModuleCatalogPort: createMasterDataModuleCatalogPortStub({
          resolveModuleSlugsByIds: vi
            .fn()
            .mockResolvedValue(new Map([[visitpadModuleId, "visitpad"]])),
          resolveModuleKindBySlugs: vi
            .fn()
            .mockResolvedValue(new Map([["visitpad", "product"]])),
        }),
      },
      "tenant-a",
      undefined,
      { productOnly: true },
    );

    expect(result.map((c) => c.id)).toEqual(["cap-vp"]);
    expect(result.some((c) => c.module === "user-management")).toBe(false);
    expect(result.some((c) => c.module === "configurator")).toBe(false);
  });

  it("excludes foundation module capabilities when productOnly is true", async () => {
    const empiModuleId = "44444444-4444-4444-8444-444444444444";
    const opdModuleId = "55555555-5555-4555-8555-555555555555";
    const capabilityRepository = new InMemoryCapabilityRepository(
      [
        capability({
          id: "cap-empi",
          module: "empi",
          source_catalog: "master_data",
          source_module_slug: "empi",
          source_permission_slug: "read",
        }),
        capability({
          id: "cap-opd",
          module: "opd",
          source_catalog: "master_data",
          source_module_slug: "opd",
          source_permission_slug: "read",
        }),
      ].map((c) => ({ capability: c })),
    );

    const result = await listAssignableRuntimeCapabilities(
      {
        capabilityRepository,
        tenantModuleEntitlementPort: {
          listTenantEnabledModuleIds: vi.fn().mockResolvedValue([empiModuleId, opdModuleId]),
        },
        masterDataModuleCatalogPort: createMasterDataModuleCatalogPortStub({
          resolveModuleSlugsByIds: vi
            .fn()
            .mockResolvedValue(new Map([[empiModuleId, "empi"], [opdModuleId, "opd"]])),
          resolveModuleKindBySlugs: vi
            .fn()
            .mockResolvedValue(new Map([["empi", "foundation"], ["opd", "product"]])),
        }),
      },
      "tenant-a",
      undefined,
      { productOnly: true },
    );

    expect(result.map((c) => c.id)).toEqual(["cap-opd"]);
    expect(result.some((c) => c.module === "empi")).toBe(false);
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
          masterDataModuleCatalogPort: createMasterDataModuleCatalogPortStub({
            resolveModuleSlugsByIds: vi.fn(),
          }),
        },
        "tenant-a",
      ),
    ).rejects.toBeInstanceOf(ModuleEntitlementLookupError);
  });
});
