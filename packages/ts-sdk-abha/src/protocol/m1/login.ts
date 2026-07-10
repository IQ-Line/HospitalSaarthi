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
  /** PHR ABHA-address verify (`/v3/phr/web/login/abha/verify`). */
  users?: unknown[];
  tokens?: {
    token?: string;
    refreshToken?: string;
    expiresIn?: number;
    refreshExpiresIn?: number;
  };
  jwtResponse?: {
    token?: string;
    refreshToken?: string;
    expiresIn?: number;
    refreshExpiresIn?: number;
  };
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
  /** Set when `needsUserSelection`; pass as `T-token` to verify/user. */
  loginTransferToken?: string;
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
  const pack = nha.tokens ?? nha.jwtResponse;
  const packedToken =
    pack && typeof pack === "object" && typeof (pack as { token?: unknown }).token === "string"
      ? (pack as { token: string }).token
      : undefined;
  if (packedToken) {
    const refresh =
      pack &&
      typeof pack === "object" &&
      typeof (pack as { refreshToken?: unknown }).refreshToken === "string"
        ? (pack as { refreshToken: string }).refreshToken
        : undefined;
    return { xToken: packedToken, tToken: refresh };
  }
  throw new Error("NHA login/verify response missing token / tokens.token / jwtResponse.token");
}

/** Returns the first candidate that is a string, else `undefined`. */
function firstString(...candidates: unknown[]): string | undefined {
  for (const value of candidates) {
    if (typeof value === "string") return value;
  }
  return undefined;
}

/** True/false from `kycVerified` boolean, else derived from `kycStatus === "VERIFIED"`. */
function resolveKycVerified(r: Record<string, unknown>): boolean | undefined {
  if (typeof r.kycVerified === "boolean") return r.kycVerified;
  if (typeof r.kycStatus === "string") return r.kycStatus === "VERIFIED";
  return undefined;
}

/** Maps rows that pass the object guard through `map`, dropping null/non-object entries. */
function mapAccountRows(
  rows: unknown,
  map: (r: Record<string, unknown>) => LoginAccountSummary | undefined,
): LoginAccountSummary[] {
  if (!Array.isArray(rows)) return [];
  const out: LoginAccountSummary[] = [];
  for (const row of rows) {
    if (!row || typeof row !== "object") continue;
    const summary = map(row as Record<string, unknown>);
    if (summary) out.push(summary);
  }
  return out;
}

export function mapNhaLoginAccounts(accounts: unknown): LoginAccountSummary[] {
  return mapAccountRows(accounts, (r) => {
    const abhaNumber = firstString(r.ABHANumber);
    if (!abhaNumber) return undefined;
    return {
      abhaNumber,
      preferredAbhaAddress: firstString(r.preferredAbhaAddress),
      name: firstString(r.name),
      gender: firstString(r.gender),
      dob: firstString(r.dob),
      status: firstString(r.status),
      kycVerified: typeof r.kycVerified === "boolean" ? r.kycVerified : undefined,
    };
  });
}

/** PHR web login verify returns `users[]` (not `accounts[]`). */
export function mapNhaPhrLoginUsers(users: unknown): LoginAccountSummary[] {
  return mapAccountRows(users, (r) => {
    const abhaNumber = firstString(r.abhaNumber, r.ABHANumber);
    if (!abhaNumber) return undefined;
    return {
      abhaNumber,
      preferredAbhaAddress: firstString(r.abhaAddress, r.preferredAbhaAddress),
      name: firstString(r.fullName, r.name),
      status: firstString(r.status),
      kycVerified: resolveKycVerified(r),
    };
  });
}
