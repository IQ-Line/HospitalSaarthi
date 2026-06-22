import { describe, expect, it } from "vitest";
import {
  isEnrolLinkedMobileSavedInNha,
  resolveSkipEnrolMobileVerify,
} from "../../../../../src/integrations/abdm/lib/m1-enrol-linked-mobile.js";

describe("m1-enrol-linked-mobile", () => {
  it("isEnrolLinkedMobileSavedInNha returns true when ABHAProfile.mobile is set", () => {
    expect(
      isEnrolLinkedMobileSavedInNha({
        ABHAProfile: { mobile: "9876543210" },
      }),
    ).toBe(true);
  });

  it("isEnrolLinkedMobileSavedInNha returns false when mobile is null", () => {
    expect(
      isEnrolLinkedMobileSavedInNha({
        ABHAProfile: { mobile: null },
      }),
    ).toBe(false);
  });

  it("resolveSkipEnrolMobileVerify respects explicit true", () => {
    expect(
      resolveSkipEnrolMobileVerify(true, { ABHAProfile: { mobile: null } }),
    ).toBe(true);
  });

  it("resolveSkipEnrolMobileVerify respects explicit false", () => {
    expect(
      resolveSkipEnrolMobileVerify(false, {
        ABHAProfile: { mobile: "9876543210" },
      }),
    ).toBe(false);
  });

  it("resolveSkipEnrolMobileVerify infers from NHA profile when flag omitted", () => {
    expect(
      resolveSkipEnrolMobileVerify(undefined, {
        ABHAProfile: { mobile: "9876543210" },
      }),
    ).toBe(true);
    expect(
      resolveSkipEnrolMobileVerify(undefined, {
        ABHAProfile: { mobile: null },
      }),
    ).toBe(false);
  });
});
