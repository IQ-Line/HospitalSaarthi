import { describe, expect, it } from "vitest";
import {
  PLATFORM_SUPER_ADMIN_ROLE,
  RESERVED_ROLE_CODES,
  isReservedRoleCode,
} from "../../../src/domain/reserved-role-codes.js";
import { normalizeRoleCode } from "../../../src/domain/normalize-role-code.js";

describe("reserved role codes", () => {
  it("reserves the canonical platform super-admin code", () => {
    expect(isReservedRoleCode(PLATFORM_SUPER_ADMIN_ROLE)).toBe(true);
    expect(RESERVED_ROLE_CODES.has(PLATFORM_SUPER_ADMIN_ROLE)).toBe(true);
  });

  it("does not reserve ordinary tenant role codes (incl. the underscore spelling the bypass does NOT match)", () => {
    for (const code of ["admin", "tenant-admin", "doctor", "super_admin", "superadmin"]) {
      expect(isReservedRoleCode(code)).toBe(false);
    }
  });

  // The "super-admin" role string no longer grants any authority — platform authority is the
  // scope:platform membership (platform_admins), not a role name. The reservation is retained as
  // defense-in-depth so a tenant cannot mint a confusingly-named platform role; it must still catch
  // every case/whitespace variant that normalizes to the canonical code.
  describe("reservation covers normalized variants", () => {
    it("reserves every case/whitespace variant of the canonical code", () => {
      for (const input of ["super-admin", " Super-Admin ", "SUPER-ADMIN", "  super-admin  "]) {
        expect(isReservedRoleCode(normalizeRoleCode(input))).toBe(true);
      }
    });

    it("does not reserve inputs that normalize to a different code (no false reservations)", () => {
      for (const input of ["super_admin", "superadmin", "admin", "tenant-admin", "doctor"]) {
        expect(isReservedRoleCode(normalizeRoleCode(input))).toBe(false);
      }
    });
  });
});
