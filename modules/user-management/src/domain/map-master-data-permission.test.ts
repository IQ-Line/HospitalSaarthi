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
        moduleSlug: "visitpad-templates",
        permissionSlug: "visitpad.view",
      }).capability_key,
    ).toBe("visitpad-templates:visitpad:view");
  });

  it("maps visitpad-templates hyphenated catalog permissions", () => {
    const read = mapMasterDataPermissionToRuntimeCapability({
      moduleSlug: "visitpad-templates",
      permissionSlug: "visitpad-templates-catalog-read",
      catalogAction: "read",
      displayName: "Visitpad catalog read",
    });
    expect(read.capability_key).toBe("visitpad-templates:catalog:read");

    const write = mapMasterDataPermissionToRuntimeCapability({
      moduleSlug: "visitpad-templates",
      permissionSlug: "visitpad-templates-catalog-write",
      catalogAction: "update",
      displayName: "Visitpad catalog write",
    });
    expect(write.capability_key).toBe("visitpad-templates:catalog:update");
  });

  it("maps role.assign on user-roles module", () => {
    const mapped = mapMasterDataPermissionToRuntimeCapability({
      moduleSlug: "user-roles",
      permissionSlug: "role.assign",
    });
    expect(mapped.capability_key).toBe("user-roles:role:assign");
  });

  it("suggests MD permission slug from runtime key", () => {
    expect(suggestMasterDataPermissionSlug("users:users:read")).toBe("users.read");
    expect(suggestMasterDataPermissionSlug("user-roles:role:assign")).toBe(
      "user-roles.role.assign",
    );
    expect(suggestMasterDataPermissionSlug("visitpad-templates:catalog:read")).toBe(
      "visitpad-templates.catalog.read",
    );
  });
});
