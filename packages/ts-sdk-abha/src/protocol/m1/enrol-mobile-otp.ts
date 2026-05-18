/**
 * M1 — Standalone ABHA creation via mobile OTP (provisional account).
 *
 * NHA: `POST /v3/enrollment/request/otp` then `POST /v3/enrollment/auth/byAbdm`.
 */

export interface NhaStandaloneMobileEnrolOtpBody {
  txnId: string;
  scope: string[];
  loginHint: string;
  loginId: string;
  otpSystem: string;
}

export interface NhaStandaloneMobileEnrolOtpResponse {
  txnId?: string;
  message?: string;
}

export interface EnrolMobileOtpHimsRequest {
  mobile: string;
}

export interface EnrolMobileOtpHimsResponse {
  sessionId: string;
  txnId: string;
  message: string;
}

export interface EnrolMobileVerifyStandaloneHimsRequest {
  sessionId: string;
  otp: string;
}

export interface EnrolMobileVerifyStandaloneHimsResponse {
  sessionId: string;
  txnId: string;
  message: string;
}
