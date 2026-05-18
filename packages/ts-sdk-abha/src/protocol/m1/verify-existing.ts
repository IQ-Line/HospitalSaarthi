/**
 * M1 — Frontdesk verification of existing ABHA (login OTP path on NHA).
 */

export interface VerifyAbhaNumberOtpHimsRequest {
  abhaNumber: string;
  /** `aadhaar` (default) or `abha-otp` (ABDM app OTP). */
  channel?: "aadhaar" | "abha-otp";
}

export interface VerifyAbhaAddressOtpHimsRequest {
  abhaAddress: string;
  /** `mobile` (default) or `aadhaar`. */
  channel?: "mobile" | "aadhaar";
}

export interface VerifyOtpHimsResponse {
  sessionId: string;
  txnId: string;
  message: string;
}

export interface VerifyConfirmHimsRequest {
  sessionId: string;
  otp: string;
}

import type { LoginAccountSummary } from "./login.js";

export interface VerifyConfirmHimsResponse {
  sessionId: string;
  txnId: string;
  message: string;
  authResult?: string;
  accounts?: LoginAccountSummary[];
  needsUserSelection?: boolean;
}
