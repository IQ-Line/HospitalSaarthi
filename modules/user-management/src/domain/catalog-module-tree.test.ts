import { describe, expect, it } from "vitest";
import {
  expandModuleIdsWithDescendants,
  expandModuleSlugsWithDescendants,
  isCatalogL1Module,
  moduleSlugsForIds,
} from "./catalog-module-tree.js";

const tree = [
  { id: "l1-md", slug: "master-data", parent_id: null, level: 1 },
  { id: "l2-vpm", slug: "visitpad-master", parent_id: "l1-md", level: 2 },
  { id: "l3-med", slug: "medicines", parent_id: "l2-vpm", level: 3 },
  { id: "l1-um", slug: "user-management", parent_id: null, level: 1 },
] as const;

describe("catalog-module-tree", () => {
  it("isCatalogL1Module requires level 1 and no parent", () => {
    expect(isCatalogL1Module(tree[0])).toBe(true);
    expect(isCatalogL1Module(tree[1])).toBe(false);
  });

  it("expandModuleIdsWithDescendants includes all descendants", () => {
    expect([...expandModuleIdsWithDescendants(new Set(["l1-md"]), tree)].sort()).toEqual(
      ["l1-md", "l2-vpm", "l3-med"].sort(),
    );
  });

  it("expandModuleSlugsWithDescendants maps slugs through the same tree", () => {
    expect([...expandModuleSlugsWithDescendants(["master-data"], tree)].sort()).toEqual(
      ["master-data", "medicines", "visitpad-master"].sort(),
    );
  });

  it("moduleSlugsForIds resolves catalog slugs without hardcoding", () => {
    expect(moduleSlugsForIds(new Set(["l1-um"]), tree)).toEqual(["user-management"]);
  });
});
