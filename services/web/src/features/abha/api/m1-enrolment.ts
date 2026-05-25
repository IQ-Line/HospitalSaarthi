import { abdmFetch } from '@/features/abha/api/abdm-client';
import type {
  AbhaAddressSuggestionsResponse,
  CreateAbhaAddressResponse,
  EnrolAadhaarOtpResponse,
  EnrolAadhaarVerifyResponse,
  EnrolMobileVerifyConfirmResponse,
  EnrolMobileVerifySendOtpResponse,
  ProfileAccountResponse,
} from '@/features/abha/types';

export function sendAadhaarOtp(aadhaarNumber: string): Promise<EnrolAadhaarOtpResponse> {
  return abdmFetch<EnrolAadhaarOtpResponse>('/m1/enrol/aadhaar/otp', {
    method: 'POST',
    body: JSON.stringify({ aadhaarNumber }),
  });
}

export function resendAadhaarOtp(
  sessionId: string,
  aadhaarNumber: string,
): Promise<EnrolAadhaarOtpResponse> {
  return abdmFetch<EnrolAadhaarOtpResponse>('/m1/enrol/aadhaar/otp/resend', {
    method: 'POST',
    body: JSON.stringify({ sessionId, aadhaarNumber }),
  });
}

export function verifyAadhaarOtp(input: {
  sessionId: string;
  otp: string;
  mobile: string;
}): Promise<EnrolAadhaarVerifyResponse> {
  return abdmFetch<EnrolAadhaarVerifyResponse>('/m1/enrol/aadhaar/verify', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export function getAbhaProfile(sessionId: string): Promise<ProfileAccountResponse> {
  const qs = new URLSearchParams({ sessionId });
  return abdmFetch<ProfileAccountResponse>(`/m1/profile?${qs.toString()}`);
}

export function sendMobileVerifyOtp(input: {
  sessionId: string;
  mobile: string;
}): Promise<EnrolMobileVerifySendOtpResponse> {
  return abdmFetch<EnrolMobileVerifySendOtpResponse>('/m1/enrol/mobile-verify/otp', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export function confirmMobileVerifyOtp(input: {
  sessionId: string;
  otp: string;
}): Promise<EnrolMobileVerifyConfirmResponse> {
  return abdmFetch<EnrolMobileVerifyConfirmResponse>('/m1/enrol/mobile-verify/verify', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export function getAbhaAddressSuggestions(
  sessionId: string,
): Promise<AbhaAddressSuggestionsResponse> {
  const qs = new URLSearchParams({ sessionId });
  return abdmFetch<AbhaAddressSuggestionsResponse>(`/m1/abha-address/suggestions?${qs.toString()}`);
}

export function createAbhaAddress(input: {
  sessionId: string;
  abhaAddress: string;
  preferred?: number;
}): Promise<CreateAbhaAddressResponse> {
  return abdmFetch<CreateAbhaAddressResponse>('/m1/abha-address', {
    method: 'POST',
    body: JSON.stringify({ preferred: 1, ...input }),
  });
}
