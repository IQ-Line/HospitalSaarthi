import { AbdmUseCaseError } from "./m1-errors.js";

export type M1OtpRateLimitAction =
  | "enrol-aadhaar-otp"
  | "enrol-aadhaar-resend"
  | "enrol-mobile-verify-send"
  | "login-otp"
  | "verify-otp"
  | "profile-update-otp";

const buckets = new Map<string, number[]>();

function limitConfig(): { max: number; windowMs: number } {
  const max = Number(process.env["ABDM_OTP_RATE_LIMIT_MAX"] ?? 10);
  const windowSec = Number(process.env["ABDM_OTP_RATE_LIMIT_WINDOW_SEC"] ?? 3600);
  return {
    max: Number.isFinite(max) && max > 0 ? max : 10,
    windowMs: Number.isFinite(windowSec) && windowSec > 0 ? windowSec * 1000 : 3_600_000,
  };
}

/** In-process sliding window per tenant + action (Phase A). Replace with Redis in multi-instance prod. */
export function assertM1OtpRateLimit(iqTenantId: string, action: M1OtpRateLimitAction): void {
  const { max, windowMs } = limitConfig();
  const key = `${iqTenantId}:${action}`;
  const now = Date.now();
  const windowStart = now - windowMs;
  const hits = (buckets.get(key) ?? []).filter((t) => t > windowStart);
  if (hits.length >= max) {
    throw new AbdmUseCaseError(
      `OTP rate limit exceeded for ${action} (max ${max} per ${windowMs / 1000}s)`,
      429,
      "RATE_LIMITED",
    );
  }
  hits.push(now);
  buckets.set(key, hits);
}

/** Test-only reset. */
export function resetM1OtpRateLimitForTests(): void {
  buckets.clear();
}
