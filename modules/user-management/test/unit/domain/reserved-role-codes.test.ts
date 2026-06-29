import { describe, expect, it } from "vitest";
import {
  PLATFORM_SUPER_ADMIN_ROLE,
  RESERVED_ROLE_CODES,
  isReservedRoleCode,
} from "../../../src/domain/reserved-role-codes.js";
import { normalizeRoleCode } from "../../../src/domain/normalize-role-code.js";
import { isPlatformSuperAdminRole } from "../../../src/http/resolve-effective-tenant-id.js";

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

  // The load-bearing invariant of this gate: the EXACT value the cross-tenant bypass
  // matches is the EXACT value the reservation blocks. Both read PLATFORM_SUPER_ADMIN_ROLE
  // from this one module, so a tenant cannot mint a code that dodges the reservation yet
  // still trips the bypass. This test fails the moment those two diverge.
  describe("reservation ⇄ bypass alignment", () => {
    it("every input the bypass matches is reserved after normalization", () => {
      for (const input of ["super-admin", " Super-Admin ", "SUPER-ADMIN", "  super-admin  "]) {
        expect(isPlatformSuperAdminRole(input)).toBe(true); // bypass would grant cross-tenant
        expect(isReservedRoleCode(normalizeRoleCode(input))).toBe(true); // ...so it is reserved
      }
    });

    it("inputs the bypass does NOT match are NOT reserved (no false reservations)", () => {
      for (const input of ["super_admin", "superadmin", "admin", "tenant-admin", "doctor"]) {
        expect(isPlatformSuperAdminRole(input)).toBe(false);
        expect(isReservedRoleCode(normalizeRoleCode(input))).toBe(false);
      }
    });
  });
});
