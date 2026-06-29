import { describe, expect, it } from "vitest";
import { secureOtpCompare } from "./secure-otp-compare.js";

describe("secureOtpCompare", () => {
  it("returns true for matching OTPs", () => {
    expect(secureOtpCompare("123456", "123456")).toBe(true);
  });

  it("returns false for mismatched OTPs", () => {
    expect(secureOtpCompare("123456", "654321")).toBe(false);
  });

  it("returns false when provided token is missing", () => {
    expect(secureOtpCompare("123456", undefined)).toBe(false);
    expect(secureOtpCompare("123456", null)).toBe(false);
  });

  it("returns false when lengths differ", () => {
    expect(secureOtpCompare("123456", "12345")).toBe(false);
  });
});
