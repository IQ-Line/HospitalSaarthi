import { describe, expect, it } from "vitest";
import { resolveMasterDataPermissionSlugForMapping } from "../../../src/domain/resolve-master-data-permission-slug.js";

describe("resolveMasterDataPermissionSlugForMapping", () => {
  it("passes through dotted product permission slugs", () => {
    expect(resolveMasterDataPermissionSlugForMapping("user-management", "user.read")).toBe(
      "user.read",
    );
  });

  it("prefixes generic L2 junction permission slugs with module slug", () => {
    expect(resolveMasterDataPermissionSlugForMapping("allergens", "read")).toBe("allergens.read");
  });

  it("maps junction slugs module:action to dotted form", () => {
    expect(resolveMasterDataPermissionSlugForMapping("allergens", "allergens:read")).toBe(
      "allergens.read",
    );
  });

  it("maps hyphenated product permission slugs under module prefix", () => {
    expect(
      resolveMasterDataPermissionSlugForMapping(
        "visitpad-master",
        "units:create",
      ),
    ).toBe("catalog.write");
  });
});
