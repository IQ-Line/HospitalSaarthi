import { describe, expect, it } from "vitest";
import { compareCanonicalRoleCodes, normalizeRoleCode } from "../../../src/domain/normalize-role-code.js";

describe("normalizeRoleCode", () => {
  it("trims and lowercases", () => {
    expect(normalizeRoleCode("  DOCTOR  ")).toBe("doctor");
    expect(normalizeRoleCode("NURSE\n")).toBe("nurse");
  });

  it("returns empty string for whitespace-only input (rejected by callers / DB)", () => {
    expect(normalizeRoleCode("   ")).toBe("");
    expect(normalizeRoleCode("\t")).toBe("");
  });

  it("matches projection pipeline: non-empty normalized codes are kept", () => {
    const raw = " Admin ";
    const code = normalizeRoleCode(raw);
    expect(code.length).toBeGreaterThan(0);
    expect(code).toBe("admin");
  });
});

describe("compareCanonicalRoleCodes", () => {
  it("sorts lexically by UTF-16 code units (locale-independent)", () => {
    expect(compareCanonicalRoleCodes("a", "b")).toBe(-1);
    expect(compareCanonicalRoleCodes("b", "a")).toBe(1);
    expect(compareCanonicalRoleCodes("x", "x")).toBe(0);
  });

  it("orders the same as projection sort for representative role codes", () => {
    const input = ["nurse", "doctor", "admin"];
    const sorted = [...input].sort(compareCanonicalRoleCodes);
    expect(sorted).toEqual(["admin", "doctor", "nurse"]);
  });
});
