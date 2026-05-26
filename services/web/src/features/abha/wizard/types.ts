import type {
  AbhaProfileDisplay,
  EnrolAadhaarVerifyResponse,
  LoginAccountSummary,
  LoginOtpChannel,
  ProfileAccountResponse,
  VerifyAbhaAddressChannel,
} from '@/features/abha/types';

export type AbhaWizardFlow = 'create' | 'verify';

export type WizardStep =
  | 'method'
  | 'login-method'
  | 'login-abha-number'
  | 'login-abha-channel'
  | 'login-abha-address'
  | 'login-abha-address-channel'
  | 'login-mobile'
  | 'login-otp'
  | 'login-account-select'
  | 'consent'
  | 'otp'
  | 'profile'
  | 'address-edit';

export type LoginMode = 'abha-number' | 'abha-address' | 'mobile' | 'aadhaar';

export interface AbhaWizardState {
  flow: AbhaWizardFlow;
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
    isLoginAadhaarConsent: boolean;
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
  login: {
    abhaSegments: [string, string, string, string];
    channel: LoginOtpChannel | null;
    otp: string;
    otpMobileLast4: string;
    sendCount: number;
    resendCooldown: number;
    mode: LoginMode | null;
    mobile: string;
    accounts: LoginAccountSummary[];
    profileFetched: boolean;
    abhaAddress: string;
    abhaAddressError: string | null;
    abhaAddressChannel: VerifyAbhaAddressChannel | null;
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
  profileAccount: ProfileAccountResponse | null;
  verifySnapshot: EnrolAadhaarVerifyResponse | null;
}

export type AbhaWizardAction =
  | { type: 'OPEN'; flow: AbhaWizardFlow; healthcareWorkerName: string }
  | { type: 'RESET' }
  | { type: 'SET_STEP'; step: WizardStep }
  | { type: 'SET_AADHAAR_SEG'; index: 1 | 2 | 3; value: string }
  | { type: 'SET_MASK_SEG'; index: 1 | 2; masked: boolean }
  | { type: 'SET_CONSENT_ITEM'; index: number; checked: boolean }
  | { type: 'SELECT_ALL_CONSENT'; checked: boolean }
  | { type: 'SET_HW_ACK'; acknowledged: boolean }
  | { type: 'SET_BENEFICIARY_ACK'; acknowledged: boolean }
  | { type: 'SET_HEALTHCARE_WORKER_NAME'; name: string }
  | { type: 'SET_BENEFICIARY_NAME'; name: string }
  | { type: 'SET_LOGIN_AADHAAR_CONSENT'; value: boolean }
  | { type: 'INIT_OTP_SESSION'; sessionId: string; aadhaarNumber?: string }
  | { type: 'SET_OTP'; otp: string }
  | { type: 'SET_MOBILE'; mobile: string }
  | { type: 'SET_OTP_MOBILE_LAST4'; last4: string }
  | { type: 'OTP_SENT' }
  | { type: 'START_RESEND_COOLDOWN' }
  | { type: 'TICK_RESEND_COOLDOWN' }
  | { type: 'SET_LOGIN_ABHA_SEGMENTS'; segments: [string, string, string, string] }
  | { type: 'SET_LOGIN_CHANNEL'; channel: LoginOtpChannel | null }
  | { type: 'SET_LOGIN_OTP'; otp: string }
  | { type: 'SET_LOGIN_OTP_MOBILE_LAST4'; last4: string }
  | { type: 'LOGIN_OTP_SENT' }
  | { type: 'BEGIN_LOGIN_OTP'; last4: string }
  | { type: 'START_LOGIN_RESEND_COOLDOWN' }
  | { type: 'TICK_LOGIN_RESEND_COOLDOWN' }
  | { type: 'SET_LOGIN_MODE'; mode: LoginMode | null }
  | { type: 'SET_LOGIN_MOBILE'; mobile: string }
  | { type: 'SET_LOGIN_ACCOUNTS'; accounts: LoginAccountSummary[] }
  | { type: 'SET_LOGIN_PROFILE_FETCHED'; value: boolean }
  | { type: 'SET_LOGIN_ABHA_ADDRESS'; value: string }
  | { type: 'SET_LOGIN_ABHA_ADDRESS_ERROR'; error: string | null }
  | { type: 'SET_LOGIN_ABHA_ADDRESS_CHANNEL'; channel: VerifyAbhaAddressChannel | null }
  | { type: 'SET_SUBMITTING'; isSubmitting: boolean }
  | {
      type: 'SET_PROFILE_DISPLAY';
      profileDisplay: AbhaProfileDisplay | null;
      profileAccount: ProfileAccountResponse | null;
    }
  | { type: 'SET_VERIFY_SNAPSHOT'; snapshot: EnrolAadhaarVerifyResponse | null }
  | { type: 'SET_ADDRESS_SUGGESTIONS'; suggestions: string[] }
  | { type: 'SET_ADDRESS_LOCAL'; value: string }
  | { type: 'SET_ADDRESS_ERROR'; error: string | null }
  | { type: 'SET_NEEDS_MOBILE_VERIFY_OTP'; needs: boolean }
  | { type: 'SET_MOBILE_VERIFY_OTP'; otp: string }
  | { type: 'RESET_ADDRESS_EDIT' }
  | { type: 'CLEAR_LOGIN_ABHA_ADDRESS' };
