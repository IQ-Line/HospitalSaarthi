/**
 * M1 — Mobile verification during Aadhaar enrolment chain (after ABHA creation).
 *
 * NHA: `POST /v3/enrollment/request/otp` (mobile scope) + `POST /v3/enrollment/auth/byAbdm`.
 * Source: `milestone1.md` §mobile verify during enrolment.
 */

export interface NhaEnrolMobileOtpDuringEnrolBody {
  txnId: string;
  scope: string[];
  loginHint: string;
  loginId: string;
  otpSystem: string;
}

export interface NhaEnrolMobileOtpDuringEnrolResponse {
  txnId?: string;
  message?: string;
}

export interface NhaEnrolAuthByAbdmBody {
  scope: string[];
  authData: {
    authMethods: ["otp"];
    otp: {
      timeStamp: string;
      txnId: string;
      otpValue: string;
    };
  };
}

export interface NhaEnrolAuthByAbdmResponse {
  txnId?: string;
  authResult?: string;
  message?: string;
}

export interface EnrolMobileVerifySendOtpHimsRequest {
  sessionId: string;
  mobile: string;
}

export interface EnrolMobileVerifySendOtpHimsResponse {
  sessionId: string;
  txnId: string;
  message: string;
}

export interface EnrolMobileVerifyConfirmHimsRequest {
  sessionId: string;
  otp: string;
}

export interface EnrolMobileVerifyConfirmHimsResponse {
  sessionId: string;
  txnId: string;
  message: string;
}
