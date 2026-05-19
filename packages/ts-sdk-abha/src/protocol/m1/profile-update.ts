/**
 * M1 — Profile mobile/email update (authenticated with session x_token).
 *
 * NHA: `POST /v3/profile/account/request/otp` + `POST /v3/profile/account/verify`.
 */

export interface NhaProfileAccountRequestOtpBody {
  scope: string[];
  loginHint: string;
  loginId: string;
  otpSystem: string;
}

export interface NhaProfileAccountRequestOtpResponse {
  txnId?: string;
  message?: string;
}

export interface NhaProfileAccountVerifyBody {
  scope: string[];
  authData: {
    authMethods: ["otp"];
    otp: {
      txnId: string;
      otpValue: string;
    };
  };
}

export interface NhaProfileAccountVerifyResponse {
  txnId?: string;
  authResult?: string;
  message?: string;
}

export type ProfileUpdateChannel = "mobile" | "email";

export interface ProfileUpdateOtpHimsRequest {
  sessionId: string;
  mobile?: string;
  email?: string;
}

export interface ProfileUpdateOtpHimsResponse {
  sessionId: string;
  txnId: string;
  message: string;
}

export interface ProfileUpdateVerifyHimsRequest {
  sessionId: string;
  otp: string;
}

export interface ProfileUpdateVerifyHimsResponse {
  sessionId: string;
  txnId: string;
  message: string;
  authResult?: string;
}
