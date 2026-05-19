/**
 * M1 — ABHA creation via Aadhaar OTP (NHA wire + HIMS shapes).
 *
 * Source: Postman "ABHA enrolment via Aadhaar" → Send OTP, and
 * `docs/external/abdm/v3-m1-abha-v3-apis-creation-verification.md`.
 */

/** POST `/v3/enrollment/request/otp` body (Aadhaar path). */
export interface NhaEnrolmentRequestOtpBody {
  txnId: string;
  scope: string[];
  loginHint: string;
  loginId: string;
  otpSystem: string;
}

/** POST `/v3/enrollment/request/otp` success body (subset; NHA may add fields). */
export interface NhaEnrolmentRequestOtpResponse {
  txnId?: string;
  message?: string;
}

/** HIMS adapter input — plain 12-digit Aadhaar (server encrypts before NHA). */
export interface EnrolAadhaarOtpHimsRequest {
  aadhaarNumber: string;
}

/** HIMS adapter response after OTP dispatch. */
export interface EnrolAadhaarOtpHimsResponse {
  sessionId: string;
  txnId: string;
  message: string;
}
