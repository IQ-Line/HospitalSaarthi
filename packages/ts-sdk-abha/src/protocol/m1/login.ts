/**
 * M1 — Login to existing ABHA (ABHA number + Aadhaar OTP path).
 *
 * NHA:
 *   - `POST /v3/profile/login/request/otp`
 *   - `POST /v3/profile/login/verify`
 */

export interface NhaLoginRequestOtpBody {
  scope: string[];
  loginHint: string;
  loginId: string;
  otpSystem: string;
}

export interface NhaLoginRequestOtpResponse {
  txnId?: string;
  message?: string;
}

export interface NhaLoginVerifyBody {
  scope: string[];
  authData: {
    authMethods: ["otp"];
    otp: {
      txnId: string;
      otpValue: string;
    };
  };
}

export interface NhaLoginVerifyResponse {
  txnId?: string;
  authResult?: string;
  message?: string;
  token?: string;
  refreshToken?: string;
  expiresIn?: number;
  refreshExpiresIn?: number;
  accounts?: unknown[];
}

export interface LoginAbhaNumberOtpHimsRequest {
  /** ABHA number with or without hyphens (e.g. 91-1234-5678-9012). */
  abhaNumber: string;
  /** `aadhaar` (default) sends OTP to Aadhaar-linked mobile; `abha-otp` uses ABDM app OTP. */
  channel?: "aadhaar" | "abha-otp";
}

export interface LoginAadhaarOtpHimsRequest {
  aadhaarNumber: string;
}

export interface LoginMobileOtpHimsRequest {
  mobile: string;
}

export interface LoginAbhaNumberOtpHimsResponse {
  sessionId: string;
  txnId: string;
  message: string;
}

export interface LoginVerifyHimsRequest {
  sessionId: string;
  otp: string;
}

export interface LoginVerifyHimsResponse {
  sessionId: string;
  txnId: string;
  message: string;
  authResult?: string;
}

export function extractLoginProfileTokens(nha: NhaLoginVerifyResponse): {
  xToken: string;
  tToken?: string;
} {
  if (typeof nha.token === "string" && nha.token) {
    return {
      xToken: nha.token,
      tToken: typeof nha.refreshToken === "string" ? nha.refreshToken : undefined,
    };
  }
  throw new Error("NHA login/verify response missing token");
}
