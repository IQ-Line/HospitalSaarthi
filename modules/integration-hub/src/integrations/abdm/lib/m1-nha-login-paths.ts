/** Which NHA login API tree a session uses (stored on session after OTP request). */
export type M1NhaLoginApiVariant = "profile" | "phr-abha";

export const LOGIN_API_VARIANT_KEY = "loginApiVariant";

export function nhaLoginRequestOtpPath(variant: M1NhaLoginApiVariant): string {
  return variant === "phr-abha"
    ? "/v3/phr/web/login/abha/request/otp"
    : "/v3/profile/login/request/otp";
}

export function nhaLoginVerifyOtpPath(variant: M1NhaLoginApiVariant): string {
  return variant === "phr-abha"
    ? "/v3/phr/web/login/abha/verify"
    : "/v3/profile/login/verify";
}

export function parseLoginApiVariant(raw: unknown): M1NhaLoginApiVariant {
  return raw === "phr-abha" ? "phr-abha" : "profile";
}
