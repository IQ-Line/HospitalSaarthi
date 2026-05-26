import { CONSENT_ITEMS, RESEND_COOLDOWN_SEC } from './constants';
import type { AbhaWizardAction, AbhaWizardState } from './types';

function initialConsentChecked(): Record<number, boolean> {
  return Object.fromEntries(CONSENT_ITEMS.map((_, i) => [i, false]));
}

export function createInitialAbhaWizardState(): AbhaWizardState {
  return {
    step: 'method',
    aadhaar: { seg1: '', seg2: '', seg3: '', maskSeg1: false, maskSeg2: false },
    consent: {
      checked: initialConsentChecked(),
      hwAcknowledged: false,
      beneficiaryAcknowledged: false,
      healthcareWorkerName: '',
      beneficiaryName: '',
    },
    otpSession: {
      sessionId: '',
      aadhaarNumber: '',
      otp: '',
      mobile: '',
      otpMobileLast4: '',
      sendCount: 0,
      resendCooldown: 0,
    },
    address: {
      suggestions: [],
      addressLocal: '',
      addressError: null,
      needsMobileVerifyOtp: false,
      mobileVerifyOtp: '',
    },
    isSubmitting: false,
    profileDisplay: null,
    verifySnapshot: null,
  };
}

export function abhaWizardReducer(
  state: AbhaWizardState,
  action: AbhaWizardAction,
): AbhaWizardState {
  switch (action.type) {
    case 'SET_STEP':
      return { ...state, step: action.step };
    case 'RESET':
      return createInitialAbhaWizardState();
    case 'SET_AADHAAR_SEG': {
      const key = action.index === 1 ? 'seg1' : action.index === 2 ? 'seg2' : 'seg3';
      return { ...state, aadhaar: { ...state.aadhaar, [key]: action.value } };
    }
    case 'SET_MASK_SEG': {
      const key = action.index === 1 ? 'maskSeg1' : 'maskSeg2';
      return { ...state, aadhaar: { ...state.aadhaar, [key]: action.masked } };
    }
    case 'SET_CONSENT_ITEM':
      return {
        ...state,
        consent: {
          ...state.consent,
          checked: { ...state.consent.checked, [action.index]: action.checked },
        },
      };
    case 'SELECT_ALL_CONSENT':
      return {
        ...state,
        consent: {
          ...state.consent,
          checked: Object.fromEntries(CONSENT_ITEMS.map((_, i) => [i, action.checked])),
          hwAcknowledged: action.checked,
          beneficiaryAcknowledged: action.checked,
        },
      };
    case 'SET_HW_ACK':
      return { ...state, consent: { ...state.consent, hwAcknowledged: action.acknowledged } };
    case 'SET_BENEFICIARY_ACK':
      return {
        ...state,
        consent: { ...state.consent, beneficiaryAcknowledged: action.acknowledged },
      };
    case 'SET_HEALTHCARE_WORKER_NAME':
      return {
        ...state,
        consent: { ...state.consent, healthcareWorkerName: action.name },
      };
    case 'SET_BENEFICIARY_NAME':
      return { ...state, consent: { ...state.consent, beneficiaryName: action.name } };
    case 'INIT_OTP_SESSION':
      return {
        ...state,
        otpSession: {
          ...state.otpSession,
          sessionId: action.sessionId,
          aadhaarNumber: action.aadhaarNumber,
        },
      };
    case 'SET_OTP':
      return { ...state, otpSession: { ...state.otpSession, otp: action.otp } };
    case 'SET_MOBILE':
      return { ...state, otpSession: { ...state.otpSession, mobile: action.mobile } };
    case 'SET_OTP_MOBILE_LAST4':
      return { ...state, otpSession: { ...state.otpSession, otpMobileLast4: action.last4 } };
    case 'OTP_SENT':
      return {
        ...state,
        otpSession: { ...state.otpSession, sendCount: state.otpSession.sendCount + 1 },
      };
    case 'START_RESEND_COOLDOWN':
      return {
        ...state,
        otpSession: { ...state.otpSession, resendCooldown: RESEND_COOLDOWN_SEC },
      };
    case 'TICK_RESEND_COOLDOWN': {
      const next = state.otpSession.resendCooldown <= 1 ? 0 : state.otpSession.resendCooldown - 1;
      return { ...state, otpSession: { ...state.otpSession, resendCooldown: next } };
    }
    case 'SET_SUBMITTING':
      return { ...state, isSubmitting: action.isSubmitting };
    case 'SET_PROFILE_DISPLAY':
      return { ...state, profileDisplay: action.profileDisplay };
    case 'SET_VERIFY_SNAPSHOT':
      return { ...state, verifySnapshot: action.snapshot };
    case 'SET_ADDRESS_SUGGESTIONS':
      return { ...state, address: { ...state.address, suggestions: action.suggestions } };
    case 'SET_ADDRESS_LOCAL':
      return {
        ...state,
        address: { ...state.address, addressLocal: action.value, addressError: null },
      };
    case 'SET_ADDRESS_ERROR':
      return { ...state, address: { ...state.address, addressError: action.error } };
    case 'SET_NEEDS_MOBILE_VERIFY_OTP':
      return { ...state, address: { ...state.address, needsMobileVerifyOtp: action.needs } };
    case 'SET_MOBILE_VERIFY_OTP':
      return { ...state, address: { ...state.address, mobileVerifyOtp: action.otp } };
    case 'RESET_ADDRESS_EDIT':
      return {
        ...state,
        step: 'profile',
        address: {
          ...state.address,
          needsMobileVerifyOtp: false,
          mobileVerifyOtp: '',
          addressLocal: '',
          addressError: null,
        },
      };
    default:
      return state;
  }
}
