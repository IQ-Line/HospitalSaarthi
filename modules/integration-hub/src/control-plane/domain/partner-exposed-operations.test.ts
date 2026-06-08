import { describe, expect, it } from "vitest";
import {
  assertAllowedOperationsSubset,
  InvalidAllowedOperationsError,
  isPartnerExposedOperation,
  PARTNER_EXPOSED_OPERATIONS,
} from "./partner-exposed-operations.js";

describe("partner-exposed-operations", () => {
  it("exposes Smart Report MVP operations", () => {
    expect(PARTNER_EXPOSED_OPERATIONS).toEqual([
      "registration.listRegistrations",
      "empi.getPatient",
    ]);
  });

  it("accepts known operations", () => {
    expect(isPartnerExposedOperation("empi.getPatient")).toBe(true);
    assertAllowedOperationsSubset(["registration.listRegistrations"]);
  });

  it("rejects unknown operations", () => {
    expect(() => assertAllowedOperationsSubset(["billing.listBills"])).toThrow(
      InvalidAllowedOperationsError,
    );
  });
});
