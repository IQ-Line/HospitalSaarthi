/**
 * M1 — POST `/v3/enrollment/enrol/byAadhaar` (verify Aadhaar OTP, create ABHA).
 *
 * Source: `milestone1.md`, `docs/external/abdm/v3-m1-abha-v3-apis-creation-verification.md`.
 */

export const NHA_ABHA_ENROLMENT_CONSENT = {
  code: "abha-enrollment",
  version: "1.4",
} as const;

/** NHA request body for Aadhaar OTP verification + ABHA creation. */
export interface NhaEnrolByAadhaarBody {
  authData: {
    authMethods: ["otp"];
    otp: {
      txnId: string;
      otpValue: string;
      mobile?: string;
    };
  };
  consent: {
    code: string;
    version: string;
  };
}

/** NHA success body (subset; field names vary slightly across NHA versions). */
export interface NhaEnrolByAadhaarResponse {
  txnId?: string;
  healthIdNumber?: string;
  /** Some collections use `tokens`; docs often show `jwtResponse`. */
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
  /** Demographics / profile snapshot (shape varies). */
  ABHAProfile?: Record<string, unknown>;
  new?: boolean;
  isNew?: boolean;
  message?: string;
}

export interface EnrolAadhaarVerifyHimsRequest {
  sessionId: string;
  otp: string;
  /** Optional 10-digit mobile (NHA may require for some policies). */
  mobile?: string;
}

export interface EnrolAadhaarVerifyHimsResponse {
  sessionId: string;
  txnId: string;
  healthIdNumber?: string;
  isNew?: boolean;
  message?: string;
}

export function extractEnrolmentProfileTokens(nha: NhaEnrolByAadhaarResponse): {
  xToken: string;
  tToken?: string;
} {
  const pack = nha.tokens ?? nha.jwtResponse;
  const token =
    pack && typeof pack === "object" && typeof (pack as { token?: unknown }).token === "string"
      ? (pack as { token: string }).token
      : undefined;
  if (!token) {
    throw new Error("NHA enrol/byAadhaar response missing tokens.token / jwtResponse.token");
  }
  const refresh =
    pack && typeof pack === "object" && typeof (pack as { refreshToken?: unknown }).refreshToken === "string"
      ? (pack as { refreshToken: string }).refreshToken
      : undefined;
  return { xToken: token, tToken: refresh };
}
