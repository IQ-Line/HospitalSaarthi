import type { AbhaProfileDisplay, EnrolAadhaarVerifyResponse } from '@/features/abha/types';

export type WizardStep = 'method' | 'login-soon' | 'consent' | 'otp' | 'profile' | 'address-edit';

export interface AbhaWizardState {
  step: WizardStep;
  aadhaar: {
    seg1: string;
    seg2: string;
    seg3: string;
    maskSeg1: boolean;
    maskSeg2: boolean;
  };
  consent: {
    checked: Record<number, boolean>;
    hwAcknowledged: boolean;
    beneficiaryAcknowledged: boolean;
    healthcareWorkerName: string;
    beneficiaryName: string;
  };
  otpSession: {
    sessionId: string;
    aadhaarNumber: string;
    otp: string;
    mobile: string;
    otpMobileLast4: string;
    sendCount: number;
    resendCooldown: number;
  };
  address: {
    suggestions: string[];
    addressLocal: string;
    addressError: string | null;
    needsMobileVerifyOtp: boolean;
    mobileVerifyOtp: string;
  };
  isSubmitting: boolean;
  profileDisplay: AbhaProfileDisplay | null;
  verifySnapshot: EnrolAadhaarVerifyResponse | null;
}

export type AbhaWizardAction =
  | { type: 'SET_STEP'; step: WizardStep }
  | { type: 'RESET' }
  | { type: 'SET_AADHAAR_SEG'; index: 1 | 2 | 3; value: string }
  | { type: 'SET_MASK_SEG'; index: 1 | 2; masked: boolean }
  | { type: 'SET_CONSENT_ITEM'; index: number; checked: boolean }
  | { type: 'SELECT_ALL_CONSENT'; checked: boolean }
  | { type: 'SET_HW_ACK'; acknowledged: boolean }
  | { type: 'SET_BENEFICIARY_ACK'; acknowledged: boolean }
  | { type: 'SET_HEALTHCARE_WORKER_NAME'; name: string }
  | { type: 'SET_BENEFICIARY_NAME'; name: string }
  | { type: 'INIT_OTP_SESSION'; sessionId: string; aadhaarNumber: string }
  | { type: 'SET_OTP'; otp: string }
  | { type: 'SET_MOBILE'; mobile: string }
  | { type: 'SET_OTP_MOBILE_LAST4'; last4: string }
  | { type: 'OTP_SENT' }
  | { type: 'START_RESEND_COOLDOWN' }
  | { type: 'TICK_RESEND_COOLDOWN' }
  | { type: 'SET_SUBMITTING'; isSubmitting: boolean }
  | { type: 'SET_PROFILE_DISPLAY'; profileDisplay: AbhaProfileDisplay | null }
  | { type: 'SET_VERIFY_SNAPSHOT'; snapshot: EnrolAadhaarVerifyResponse | null }
  | { type: 'SET_ADDRESS_SUGGESTIONS'; suggestions: string[] }
  | { type: 'SET_ADDRESS_LOCAL'; value: string }
  | { type: 'SET_ADDRESS_ERROR'; error: string | null }
  | { type: 'SET_NEEDS_MOBILE_VERIFY_OTP'; needs: boolean }
  | { type: 'SET_MOBILE_VERIFY_OTP'; otp: string }
  | { type: 'RESET_ADDRESS_EDIT' };
