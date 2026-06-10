import { describe, expect, it } from "vitest";
import {
  mapMasterDataPermissionToRuntimeCapability,
  suggestMasterDataPermissionSlug,
} from "./map-master-data-permission.js";

describe("mapMasterDataPermissionToRuntimeCapability", () => {
  it("maps L2+ junction CRUD to moduleSlug:moduleSlug:action", () => {
    const mapped = mapMasterDataPermissionToRuntimeCapability({
      moduleSlug: "users",
      permissionSlug: "read",
    });

    expect(mapped).toMatchObject({
      capability_key: "users:users:read",
      module: "users",
      feature: "users",
      action: "read",
      source_module_slug: "users",
      source_permission_slug: "read",
      source_catalog: "master_data",
    });
  });

  it("maps user-roles and rx column modules with duplicated slug feature", () => {
    expect(
      mapMasterDataPermissionToRuntimeCapability({
        moduleSlug: "user-roles",
        permissionSlug: "delete",
      }).capability_key,
    ).toBe("user-roles:user-roles:delete");

    expect(
      mapMasterDataPermissionToRuntimeCapability({
        moduleSlug: "route",
        permissionSlug: "edit",
        catalogAction: "update",
      }).capability_key,
    ).toBe("route:route:update");
  });

  it("maps clinical modules with nested product permission slugs", () => {
    const mapped = mapMasterDataPermissionToRuntimeCapability({
      moduleSlug: "opd",
      permissionSlug: "opd.visit.create",
    });

    expect(mapped).toMatchObject({
      capability_key: "opd:visit:create",
      module: "opd",
      feature: "visit",
      action: "create",
    });
  });

  it("maps shell and visitpad demo permissions on catalog module slugs", () => {
    expect(
      mapMasterDataPermissionToRuntimeCapability({
        moduleSlug: "master-data",
        permissionSlug: "shell.access",
      }).capability_key,
    ).toBe("master-data:shell:access");

    expect(
      mapMasterDataPermissionToRuntimeCapability({
        moduleSlug: "visitpad-master",
        permissionSlug: "visitpad.view",
      }).capability_key,
    ).toBe("visitpad-master:visitpad:view");
  });

  it("maps visitpad-master L3 module CRUD permissions", () => {
    const read = mapMasterDataPermissionToRuntimeCapability({
      moduleSlug: "units",
      permissionSlug: "read",
      catalogAction: "read",
      displayName: "Units read",
    });
    expect(read.capability_key).toBe("units:units:read");

    const write = mapMasterDataPermissionToRuntimeCapability({
      moduleSlug: "chief-complaints",
      permissionSlug: "create",
      catalogAction: "create",
      displayName: "Chief complaints create",
    });
    expect(write.capability_key).toBe("chief-complaints:chief-complaints:create");
  });

  it("maps role.assign on user-roles module", () => {
    const mapped = mapMasterDataPermissionToRuntimeCapability({
      moduleSlug: "user-roles",
      permissionSlug: "role.assign",
    });
    expect(mapped.capability_key).toBe("user-roles:role:assign");
  });

  it("maps Integration Hub control-plane product permissions", () => {
    expect(
      mapMasterDataPermissionToRuntimeCapability({
        moduleSlug: "integration",
        permissionSlug: "integration.read",
      }).capability_key,
    ).toBe("integration:integration:read");

    expect(
      mapMasterDataPermissionToRuntimeCapability({
        moduleSlug: "integration",
        permissionSlug: "integration.activate",
      }).capability_key,
    ).toBe("integration:integration:activate");

    expect(
      mapMasterDataPermissionToRuntimeCapability({
        moduleSlug: "integration",
        permissionSlug: "api-key.issue",
      }).capability_key,
    ).toBe("integration:api-key:issue");
  });

  it("suggests MD permission slug from runtime key", () => {
    expect(suggestMasterDataPermissionSlug("users:users:read")).toBe("users.read");
    expect(suggestMasterDataPermissionSlug("user-roles:role:assign")).toBe(
      "user-roles.role.assign",
    );
    expect(suggestMasterDataPermissionSlug("visitpad-master:visitpad:view")).toBe(
      "visitpad-master.visitpad.view",
    );
  });
});
