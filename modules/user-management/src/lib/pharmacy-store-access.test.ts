import { describe, expect, it } from "vitest";
import { ValidationError } from "../domain/errors.js";
import { resolveUserManagementHttpError } from "../http/map-user-management-error.js";
import {
  assertPharmacyStoreAccessMatchesCapabilities,
  normalizePharmacyStoreAccessInput,
} from "./pharmacy-store-access.js";
import type { Capability } from "../domain/types.js";

const PHARMACY_CAPABILITY: Capability = {
  id: "e624a081-aa5c-4279-b9a7-65b25a43ea95",
  capability_key: "pharmacy:shell:access",
  module: "pharmacy",
  feature: "shell",
  action: "access",
  display_name: "Pharmacy shell",
  is_active: true,
};

const DISPENSE_CAPABILITY: Capability = {
  id: "f734b192-bb6d-5380-b0c8-76c36b54fb06",
  capability_key: "dispense:dispense:read",
  module: "dispense",
  feature: "dispense",
  action: "read",
  display_name: "Dispense read",
  is_active: true,
  source_module_slug: "dispense",
};

const INVENTORY_CAPABILITY: Capability = {
  id: "a845c192-bb6d-5380-c0d9-87d47c65fc17",
  capability_key: "inventory-stock:stock:read",
  module: "inventory-stock",
  feature: "stock",
  action: "read",
  display_name: "Inventory stock read",
  is_active: true,
  source_module_slug: "inventory-stock",
};

const STORE_ID = "5efaafca-be32-4eff-92a5-10c215427952";

describe("pharmacy store access validation", () => {
  it("requires store access when pharmacy capabilities are granted", () => {
    expect(() =>
      assertPharmacyStoreAccessMatchesCapabilities(
        [PHARMACY_CAPABILITY],
        [PHARMACY_CAPABILITY.id],
        null,
      ),
    ).toThrow(ValidationError);

    try {
      assertPharmacyStoreAccessMatchesCapabilities(
        [PHARMACY_CAPABILITY],
        [PHARMACY_CAPABILITY.id],
        null,
      );
    } catch (error) {
      const resolved = resolveUserManagementHttpError(error, "test-correlation");
      expect(resolved.status).toBe(400);
      expect(resolved.body.code).toBe("INVALID_INPUT");
      expect(resolved.body.message).toContain("pharmacy_store_access");
    }
  });

  it("requires store access when inventory-master capabilities are granted", () => {
    const inventoryMaster: Capability = {
      id: "c956d203-cc7e-6491-d1ea-98e58d76fd28",
      capability_key: "inventory-master:inventory-master:read",
      module: "inventory-master",
      feature: "inventory-master",
      action: "read",
      display_name: "Inventory master read",
      is_active: true,
      source_module_slug: "inventory-master",
    };
    expect(() =>
      assertPharmacyStoreAccessMatchesCapabilities(
        [inventoryMaster],
        [inventoryMaster.id],
        null,
      ),
    ).toThrow(ValidationError);

    const normalized = assertPharmacyStoreAccessMatchesCapabilities(
      [inventoryMaster],
      [inventoryMaster.id],
      { primary_store_id: STORE_ID, secondary_store_ids: [] },
    );
    expect(normalized).toEqual({
      primary_store_id: STORE_ID,
      secondary_store_ids: [],
    });
  });

  it("requires store access when inventory capabilities are granted", () => {
    expect(() =>
      assertPharmacyStoreAccessMatchesCapabilities(
        [INVENTORY_CAPABILITY],
        [INVENTORY_CAPABILITY.id],
        null,
      ),
    ).toThrow(ValidationError);

    const normalized = assertPharmacyStoreAccessMatchesCapabilities(
      [INVENTORY_CAPABILITY],
      [INVENTORY_CAPABILITY.id],
      { primary_store_id: STORE_ID, secondary_store_ids: [] },
    );
    expect(normalized).toEqual({
      primary_store_id: STORE_ID,
      secondary_store_ids: [],
    });
  });

  it("rejects invalid primary store ids with a mapped client error", () => {
    expect(() => normalizePharmacyStoreAccessInput({ primary_store_id: "store-cms" })).toThrow(
      ValidationError,
    );

    try {
      normalizePharmacyStoreAccessInput({ primary_store_id: "store-cms" });
    } catch (error) {
      const resolved = resolveUserManagementHttpError(error, "test-correlation");
      expect(resolved.status).toBe(400);
      expect(resolved.body.code).toBe("INVALID_INPUT");
    }
  });

  it("requires store access when dispense capabilities are granted", () => {
    expect(() =>
      assertPharmacyStoreAccessMatchesCapabilities(
        [DISPENSE_CAPABILITY],
        [DISPENSE_CAPABILITY.id],
        null,
      ),
    ).toThrow(ValidationError);
  });

  it("accepts valid primary and secondary store ids", () => {
    const normalized = normalizePharmacyStoreAccessInput({
      primary_store_id: STORE_ID,
      secondary_store_ids: ["e56ca7d0-5cc8-4946-880f-933d19d6f033"],
    });
    expect(normalized).toEqual({
      primary_store_id: STORE_ID,
      secondary_store_ids: ["e56ca7d0-5cc8-4946-880f-933d19d6f033"],
    });
  });
});
