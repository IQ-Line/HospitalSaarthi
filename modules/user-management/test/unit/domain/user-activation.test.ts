import { describe, expect, it } from "vitest";
import { computeUserActive } from "../../../src/domain/user-activation.js";

const NOW = new Date("2026-06-29T12:00:00.000Z");
const FUTURE = new Date("2026-06-29T13:00:00.000Z");
const PAST = new Date("2026-06-29T11:00:00.000Z");

describe("computeUserActive", () => {
  it("is active: status active, not banned", () => {
    expect(computeUserActive({ status: "active", banned: false, banExpires: null }, NOW)).toBe(true);
  });

  it("is inactive: status inactive (even if not banned)", () => {
    expect(computeUserActive({ status: "inactive", banned: false, banExpires: null }, NOW)).toBe(
      false,
    );
  });

  it("is inactive: status suspended (even if not banned)", () => {
    expect(computeUserActive({ status: "suspended", banned: false, banExpires: null }, NOW)).toBe(
      false,
    );
  });

  it("is inactive: permanent ban (banExpires null) despite active status", () => {
    expect(computeUserActive({ status: "active", banned: true, banExpires: null }, NOW)).toBe(false);
  });

  it("is inactive: ban with a future expiry is still in force", () => {
    expect(computeUserActive({ status: "active", banned: true, banExpires: FUTURE }, NOW)).toBe(
      false,
    );
  });

  it("is active: ban whose expiry has already passed has lapsed", () => {
    expect(computeUserActive({ status: "active", banned: true, banExpires: PAST }, NOW)).toBe(true);
  });

  it("ban-expiry boundary: at the exact expiry instant the ban is treated as lapsed", () => {
    expect(computeUserActive({ status: "active", banned: true, banExpires: NOW }, NOW)).toBe(true);
  });

  it("is inactive: both signals bad (inactive status AND active ban)", () => {
    expect(computeUserActive({ status: "inactive", banned: true, banExpires: null }, NOW)).toBe(
      false,
    );
  });

  it("is inactive: a lapsed ban does not rescue an inactive status", () => {
    expect(computeUserActive({ status: "inactive", banned: true, banExpires: PAST }, NOW)).toBe(
      false,
    );
  });
});
