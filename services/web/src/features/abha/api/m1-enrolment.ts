import { abdmFetch } from '@/features/abha/api/abdm-client';
import type {
  EnrolAadhaarOtpResponse,
  EnrolAadhaarVerifyResponse,
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
