import { describe, expect, it } from "vitest";
import { aadhaarMatchesSessionMask } from "../../../../../src/integrations/abdm/lib/m1-aadhaar-mask.js";

describe("aadhaarMatchesSessionMask", () => {
  it("returns false when mask is missing (fail closed)", () => {
    expect(aadhaarMatchesSessionMask("123456789012", undefined)).toBe(false);
    expect(aadhaarMatchesSessionMask("123456789012", "")).toBe(false);
  });

  it("matches last four digits from mask", () => {
    expect(aadhaarMatchesSessionMask("123456789012", "********9012")).toBe(true);
    expect(aadhaarMatchesSessionMask("123456789012", "********0000")).toBe(false);
  });
});
