import { describe, expect, it } from "vitest";
import {
  mapMasterDataPermissionToRuntimeCapability,
  suggestMasterDataPermissionSlug,
} from "./map-master-data-permission.js";

describe("mapMasterDataPermissionToRuntimeCapability", () => {
  it("maps MD permission slug to canonical runtime capability for clinical modules", () => {
    const mapped = mapMasterDataPermissionToRuntimeCapability({
      moduleSlug: "opd",
      permissionSlug: "registration.create",
    });

    expect(mapped).toMatchObject({
      capability_key: "opd:registration:create",
      module: "opd",
      feature: "registration",
      action: "create",
      source_module_slug: "opd",
      source_permission_slug: "registration.create",
      source_catalog: "master_data",
    });
  });

  it("maps user-management permissions to um-prefixed runtime keys", () => {
    const mapped = mapMasterDataPermissionToRuntimeCapability({
      moduleSlug: "user-management",
      permissionSlug: "user.read",
    });

    expect(mapped.capability_key).toBe("um:user:read");
    expect(mapped.module).toBe("user-management");
  });

  it("suggests MD permission slug from runtime key", () => {
    expect(suggestMasterDataPermissionSlug("um:role:assign")).toBe("user-management.role.assign");
    expect(suggestMasterDataPermissionSlug("visitpad:template:read")).toBe(
      "visitpad.template.read",
    );
  });
});
