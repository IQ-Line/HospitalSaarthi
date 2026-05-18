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

/** ABHA account row returned after mobile login OTP verify (multi-account selection). */
export interface LoginAccountSummary {
  abhaNumber: string;
  preferredAbhaAddress?: string;
  name?: string;
  gender?: string;
  dob?: string;
  status?: string;
  kycVerified?: boolean;
}

export interface LoginVerifyHimsResponse {
  sessionId: string;
  txnId: string;
  message: string;
  authResult?: string;
  /** Present when NHA returns `accounts` (mobile login) — call verify/user next. */
  accounts?: LoginAccountSummary[];
  needsUserSelection?: boolean;
}

export interface NhaLoginVerifyUserBody {
  ABHANumber: string;
  txnId: string;
}

export interface NhaLoginVerifyUserResponse {
  token?: string;
  refreshToken?: string;
  expiresIn?: number;
  refreshExpiresIn?: number;
  message?: string;
}

export interface LoginVerifyUserHimsRequest {
  sessionId: string;
  abhaNumber: string;
}

export interface LoginVerifyUserHimsResponse {
  sessionId: string;
  txnId: string;
  message: string;
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

export function mapNhaLoginAccounts(accounts: unknown): LoginAccountSummary[] {
  if (!Array.isArray(accounts)) return [];
  const out: LoginAccountSummary[] = [];
  for (const row of accounts) {
    if (!row || typeof row !== "object") continue;
    const r = row as Record<string, unknown>;
    const abhaNumber = typeof r.ABHANumber === "string" ? r.ABHANumber : "";
    if (!abhaNumber) continue;
    out.push({
      abhaNumber,
      preferredAbhaAddress:
        typeof r.preferredAbhaAddress === "string" ? r.preferredAbhaAddress : undefined,
      name: typeof r.name === "string" ? r.name : undefined,
      gender: typeof r.gender === "string" ? r.gender : undefined,
      dob: typeof r.dob === "string" ? r.dob : undefined,
      status: typeof r.status === "string" ? r.status : undefined,
      kycVerified: typeof r.kycVerified === "boolean" ? r.kycVerified : undefined,
    });
  }
  return out;
}
