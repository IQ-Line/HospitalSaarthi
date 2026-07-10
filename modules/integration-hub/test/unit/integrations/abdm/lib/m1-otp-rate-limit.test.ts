import { afterEach, describe, expect, it, vi } from "vitest";
import { AbdmUseCaseError } from "../../../../../src/integrations/abdm/lib/m1-errors.js";
import {
  assertM1OtpRateLimit,
  resetM1OtpRateLimitForTests,
} from "../../../../../src/integrations/abdm/lib/m1-otp-rate-limit.js";

const TENANT = "00000000-0000-4000-8000-000000000099";

describe("assertM1OtpRateLimit", () => {
  afterEach(() => {
    resetM1OtpRateLimitForTests();
    vi.unstubAllEnvs();
  });

  it("allows requests under the limit", () => {
    vi.stubEnv("ABDM_OTP_RATE_LIMIT_MAX", "2");
    vi.stubEnv("ABDM_OTP_RATE_LIMIT_WINDOW_SEC", "60");
    assertM1OtpRateLimit(TENANT, "enrol-aadhaar-otp");
    assertM1OtpRateLimit(TENANT, "enrol-aadhaar-otp");
  });

  it("throws 429 when limit exceeded", () => {
    vi.stubEnv("ABDM_OTP_RATE_LIMIT_MAX", "1");
    vi.stubEnv("ABDM_OTP_RATE_LIMIT_WINDOW_SEC", "60");
    assertM1OtpRateLimit(TENANT, "enrol-aadhaar-otp");
    expect(() => assertM1OtpRateLimit(TENANT, "enrol-aadhaar-otp")).toThrow(AbdmUseCaseError);
    try {
      assertM1OtpRateLimit(TENANT, "enrol-aadhaar-otp");
    } catch (e) {
      expect(e).toBeInstanceOf(AbdmUseCaseError);
      expect((e as AbdmUseCaseError).httpStatus).toBe(429);
      expect((e as AbdmUseCaseError).clientCode).toBe("RATE_LIMITED");
    }
  });
});
