import { abdmFetch } from '@/features/abha/api/abdm-client';
import type {
  AbhaAddressSuggestionsResponse,
  CreateAbhaAddressResponse,
  EnrolAadhaarOtpResponse,
  EnrolAadhaarVerifyResponse,
  EnrolMobileVerifyConfirmResponse,
  EnrolMobileVerifySendOtpResponse,
  LoginAbhaNumberOtpResponse,
  LoginOtpChannel,
  LoginVerifyResponse,
  LoginVerifyUserResponse,
  ProfileAbhaCardResponse,
  ProfileAccountResponse,
  VerifyAbhaAddressChannel,
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
  useAadhaarLinkedMobile?: boolean;
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

export function getAbhaCard(sessionId: string): Promise<ProfileAbhaCardResponse> {
  const qs = new URLSearchParams({ sessionId });
  return abdmFetch<ProfileAbhaCardResponse>(`/m1/profile/abha-card?${qs.toString()}`);
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

export function sendLoginAbhaNumberOtp(input: {
  abhaNumber: string;
  channel: LoginOtpChannel;
}): Promise<LoginAbhaNumberOtpResponse> {
  return abdmFetch<LoginAbhaNumberOtpResponse>('/m1/login/otp', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export function verifyLoginOtp(input: {
  sessionId: string;
  otp: string;
}): Promise<LoginVerifyResponse> {
  return abdmFetch<LoginVerifyResponse>('/m1/login/verify', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export function sendLoginMobileOtp(mobile: string): Promise<LoginAbhaNumberOtpResponse> {
  return abdmFetch<LoginAbhaNumberOtpResponse>('/m1/login/mobile/otp', {
    method: 'POST',
    body: JSON.stringify({ mobile }),
  });
}

export function sendLoginAadhaarOtp(aadhaarNumber: string): Promise<LoginAbhaNumberOtpResponse> {
  return abdmFetch<LoginAbhaNumberOtpResponse>('/m1/login/aadhaar/otp', {
    method: 'POST',
    body: JSON.stringify({ aadhaarNumber }),
  });
}

export function verifyLoginUser(input: {
  sessionId: string;
  abhaNumber: string;
}): Promise<LoginVerifyUserResponse> {
  return abdmFetch<LoginVerifyUserResponse>('/m1/login/verify/user', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export function sendVerifyAbhaNumberOtp(input: {
  abhaNumber: string;
  channel: LoginOtpChannel;
}): Promise<LoginAbhaNumberOtpResponse> {
  return abdmFetch<LoginAbhaNumberOtpResponse>('/m1/verify/abha-number/otp', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export function confirmVerifyAbhaNumber(input: {
  sessionId: string;
  otp: string;
}): Promise<LoginVerifyResponse> {
  return abdmFetch<LoginVerifyResponse>('/m1/verify/abha-number/verify', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export function confirmVerifyAbhaNumberUser(input: {
  sessionId: string;
  abhaNumber: string;
}): Promise<LoginVerifyUserResponse> {
  return abdmFetch<LoginVerifyUserResponse>('/m1/verify/abha-number/verify/user', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export function sendVerifyAbhaAddressOtp(input: {
  abhaAddress: string;
  channel: VerifyAbhaAddressChannel;
}): Promise<LoginAbhaNumberOtpResponse> {
  return abdmFetch<LoginAbhaNumberOtpResponse>('/m1/verify/abha-address/otp', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export function confirmVerifyAbhaAddress(input: {
  sessionId: string;
  otp: string;
}): Promise<LoginVerifyResponse> {
  return abdmFetch<LoginVerifyResponse>('/m1/verify/abha-address/verify', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}
