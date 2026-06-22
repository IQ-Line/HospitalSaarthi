import { describe, expect, it } from "vitest";
import type { Capability } from "../../../src/domain/types.js";
import {
  filterRuntimeCapabilitiesByMasterDataLinks,
  masterDataSourcePairKey,
  MODULE_PERMISSION_PAIR_SEPARATOR,
  parseMasterDataSourcePairKey,
} from "../../../src/domain/master-data-source-pair.js";

function capability(partial: Partial<Capability> & Pick<Capability, "id" | "module">): Capability {
  return {
    capability_key: partial.capability_key ?? `${partial.module}:feature:read`,
    feature: partial.feature ?? "feature",
    action: partial.action ?? "read",
    display_name: partial.display_name ?? partial.module,
    is_active: partial.is_active ?? true,
    ...partial,
  };
}

describe("masterDataSourcePairKey", () => {
  it("round-trips module and permission slugs", () => {
    const key = masterDataSourcePairKey("tariff-master", "read");
    expect(key).toContain(MODULE_PERMISSION_PAIR_SEPARATOR);
    expect(parseMasterDataSourcePairKey(key)).toEqual({
      moduleSlug: "tariff-master",
      permissionSlug: "read",
    });
  });
});

describe("filterRuntimeCapabilitiesByMasterDataLinks", () => {
  const assignableSlugs = new Set(["tariff-master", "billing-and-finance"]);
  const activePairs = new Set([
    masterDataSourcePairKey("tariff-master", "read"),
    masterDataSourcePairKey("tariff-master", "update"),
    masterDataSourcePairKey("billing-and-finance", "shell.access"),
  ]);

  it("keeps platform module capabilities without an MD link", () => {
    const caps = [
      capability({
        id: "cap-um",
        module: "user-management",
        capability_key: "users:users:read",
      }),
    ];

    expect(
      filterRuntimeCapabilitiesByMasterDataLinks(caps, assignableSlugs, activePairs).map(
        (row) => row.id,
      ),
    ).toEqual(["cap-um"]);
  });

  it("drops LOB capabilities when the MD module-permission link was removed", () => {
    const caps = [
      capability({
        id: "cap-tariff-create",
        module: "tariff-master",
        capability_key: "tariff-master:tariff-master:create",
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
    ];

    expect(
      filterRuntimeCapabilitiesByMasterDataLinks(caps, assignableSlugs, activePairs).map(
        (row) => row.id,
      ),
    ).toEqual(["cap-tariff-read"]);
  });

  it("keeps LOB capabilities when MD link is active for normalized module slug", () => {
    const caps = [
      capability({
        id: "cap-tariff-update",
        module: "tariff-master",
        capability_key: "tariff-master:tariff-master:update",
        source_catalog: "master_data",
        source_module_slug: "Tariff-Master",
        source_permission_slug: "update",
      }),
    ];

    expect(
      filterRuntimeCapabilitiesByMasterDataLinks(caps, assignableSlugs, activePairs).map(
        (row) => row.id,
      ),
    ).toEqual(["cap-tariff-update"]);
  });

  it("fails closed for LOB capabilities without MD provenance", () => {
    const caps = [
      capability({
        id: "cap-shell",
        module: "billing-and-finance",
        capability_key: "billing-and-finance:shell:access",
      }),
    ];

    expect(
      filterRuntimeCapabilitiesByMasterDataLinks(caps, assignableSlugs, activePairs),
    ).toEqual([]);
  });
});
