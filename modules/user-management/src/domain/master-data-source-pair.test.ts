import { describe, expect, it } from "vitest";
import type { Capability } from "./types.js";
import {
  filterRuntimeCapabilitiesByMasterDataLinks,
  masterDataSourcePairKey,
} from "./master-data-source-pair.js";

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
