import { describe, expect, it } from "vitest";
import { InvalidModuleSlugError } from "../../../src/domain/errors.js";
import {
  assertValidModuleSlug,
  isValidModuleSlug,
  normalizeModuleSlug,
  normalizeModuleSlugSet,
} from "../../../src/domain/module-slug.js";

describe("module slug helpers", () => {
  it("normalizes to lowercase kebab-case", () => {
    expect(normalizeModuleSlug(" User-Management ")).toBe("user-management");
  });

  it("dedupes after normalization in normalizeModuleSlugSet", () => {
    expect(normalizeModuleSlugSet(["A", "a", " A "])).toEqual(["a"]);
  });

  it("accepts catalog-aligned slugs", () => {
    expect(isValidModuleSlug("user-management")).toBe(true);
    expect(isValidModuleSlug("opd")).toBe(true);
    expect(isValidModuleSlug("billing")).toBe(true);
  });

  it("rejects invalid slug shapes", () => {
    expect(isValidModuleSlug("User_Management")).toBe(false);
    expect(isValidModuleSlug("")).toBe(false);
  });

  it("assertValidModuleSlug throws InvalidModuleSlugError", () => {
    expect(() => assertValidModuleSlug("bad_slug")).toThrow(InvalidModuleSlugError);
    expect(assertValidModuleSlug("good-one")).toBe("good-one");
  });
});
