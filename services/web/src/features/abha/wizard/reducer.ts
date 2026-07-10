import { CONSENT_ITEMS, RESEND_COOLDOWN_SEC } from './constants';
import type { AbhaWizardAction, AbhaWizardFlow, AbhaWizardState } from './types';

function initialConsentChecked(): Record<number, boolean> {
  return Object.fromEntries(CONSENT_ITEMS.map((_, i) => [i, false]));
}

function freshOtpSession(sessionId: string, aadhaarNumber: string): AbhaWizardState['otpSession'] {
  return {
    sessionId,
    aadhaarNumber,
    otp: '',
    mobile: '',
    otpMobileLast4: '',
    sendCount: 0,
    resendCooldown: 0,
    aadhaarLinkedMobile: true,
  };
}

function emptyLoginState(): AbhaWizardState['login'] {
  return {
    abhaSegments: ['', '', '', ''],
    abhaNumberError: null,
    channel: null,
    otp: '',
    otpMobileLast4: '',
    sendCount: 0,
    resendCooldown: 0,
    mode: null,
    mobile: '',
    accounts: [],
    profileFetched: false,
    abhaAddress: '',
    abhaAddressError: null,
    abhaAddressChannel: null,
  };
}

export function createInitialAbhaWizardState(flow: AbhaWizardFlow = 'create'): AbhaWizardState {
  return {
    flow,
    step: flow === 'verify' ? 'login-method' : 'method',
    aadhaar: {
      seg1: '',
      seg2: '',
      seg3: '',
      maskSeg1: false,
      maskSeg2: false,
      maskSeg3: false,
      error: null,
    },
    consent: {
      checked: initialConsentChecked(),
      hwAcknowledged: false,
      beneficiaryAcknowledged: false,
      healthcareWorkerName: '',
      beneficiaryName: '',
      isLoginAadhaarConsent: false,
    },
    otpSession: {
      sessionId: '',
      aadhaarNumber: '',
      otp: '',
      mobile: '',
      otpMobileLast4: '',
      sendCount: 0,
      resendCooldown: 0,
      aadhaarLinkedMobile: true,
    },
    login: emptyLoginState(),
    address: {
      suggestions: [],
      addressLocal: '',
      addressError: null,
      needsMobileVerifyOtp: false,
      mobileVerifyOtp: '',
    },
    isSubmitting: false,
    profileDisplay: null,
    profileAccount: null,
    verifySnapshot: null,
  };
}

const AADHAAR_SEG_KEY = { 1: 'seg1', 2: 'seg2', 3: 'seg3' } as const;
const AADHAAR_MASK_KEY = { 1: 'maskSeg1', 2: 'maskSeg2', 3: 'maskSeg3' } as const;

// Each sub-reducer owns one slice of the action union and returns the next state,
// or null when the action does not belong to that slice. The top-level reducer
// chains them, so the per-function `switch` stays small and below the cognitive
// complexity threshold while preserving every action -> state mapping exactly.

function reduceLifecycle(
  state: AbhaWizardState,
  action: AbhaWizardAction,
): AbhaWizardState | null {
  switch (action.type) {
    case 'OPEN': {
      const initial = createInitialAbhaWizardState(action.flow);
      return {
        ...initial,
        consent: { ...initial.consent, healthcareWorkerName: action.healthcareWorkerName },
      };
    }
    case 'RESET':
      return createInitialAbhaWizardState(state.flow);
    case 'SET_STEP':
      return { ...state, step: action.step };
    case 'SET_SUBMITTING':
      return { ...state, isSubmitting: action.isSubmitting };
    case 'SET_PROFILE_DISPLAY':
      return {
        ...state,
        profileDisplay: action.profileDisplay,
        profileAccount: action.profileAccount,
      };
    case 'SET_VERIFY_SNAPSHOT':
      return { ...state, verifySnapshot: action.snapshot };
    default:
      return null;
  }
}

function reduceAadhaar(
  state: AbhaWizardState,
  action: AbhaWizardAction,
): AbhaWizardState | null {
  switch (action.type) {
    case 'SET_AADHAAR_SEG':
      return {
        ...state,
        aadhaar: { ...state.aadhaar, [AADHAAR_SEG_KEY[action.index]]: action.value, error: null },
      };
    case 'SET_AADHAAR_ERROR':
      return { ...state, aadhaar: { ...state.aadhaar, error: action.error } };
    case 'SET_MASK_SEG':
      return {
        ...state,
        aadhaar: { ...state.aadhaar, [AADHAAR_MASK_KEY[action.index]]: action.masked },
      };
    default:
      return null;
  }
}

function reduceConsent(
  state: AbhaWizardState,
  action: AbhaWizardAction,
): AbhaWizardState | null {
  switch (action.type) {
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
          healthcareWorkerName: action.checked ? state.consent.healthcareWorkerName : '',
          beneficiaryName: action.checked ? state.consent.beneficiaryName : '',
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
    case 'SET_LOGIN_AADHAAR_CONSENT':
      return {
        ...state,
        consent: { ...state.consent, isLoginAadhaarConsent: action.value },
      };
    default:
      return null;
  }
}

function reduceOtpSession(
  state: AbhaWizardState,
  action: AbhaWizardAction,
): AbhaWizardState | null {
  switch (action.type) {
    case 'INIT_OTP_SESSION':
      return {
        ...state,
        otpSession: freshOtpSession(
          action.sessionId,
          action.aadhaarNumber ?? state.otpSession.aadhaarNumber,
        ),
      };
    case 'SET_OTP_SESSION_ID':
      return {
        ...state,
        otpSession: { ...state.otpSession, sessionId: action.sessionId },
      };
    case 'SET_OTP':
      return { ...state, otpSession: { ...state.otpSession, otp: action.otp } };
    case 'SET_MOBILE':
      return {
        ...state,
        otpSession: { ...state.otpSession, mobile: action.mobile },
      };
    case 'SET_AADHAAR_LINKED_MOBILE':
      return {
        ...state,
        otpSession: { ...state.otpSession, aadhaarLinkedMobile: action.value },
      };
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
    default:
      return null;
  }
}

function reduceLogin(
  state: AbhaWizardState,
  action: AbhaWizardAction,
): AbhaWizardState | null {
  switch (action.type) {
    case 'SET_LOGIN_ABHA_SEGMENTS':
      return {
        ...state,
        login: { ...state.login, abhaSegments: action.segments, abhaNumberError: null },
      };
    case 'SET_LOGIN_ABHA_NUMBER_ERROR':
      return { ...state, login: { ...state.login, abhaNumberError: action.error } };
    case 'SET_LOGIN_CHANNEL':
      return { ...state, login: { ...state.login, channel: action.channel } };
    case 'SET_LOGIN_OTP':
      return { ...state, login: { ...state.login, otp: action.otp } };
    case 'SET_LOGIN_OTP_MOBILE_LAST4':
      return { ...state, login: { ...state.login, otpMobileLast4: action.last4 } };
    case 'LOGIN_OTP_SENT':
      return {
        ...state,
        login: { ...state.login, sendCount: state.login.sendCount + 1 },
      };
    case 'BEGIN_LOGIN_OTP':
      return {
        ...state,
        login: {
          ...state.login,
          otp: '',
          sendCount: 1,
          resendCooldown: RESEND_COOLDOWN_SEC,
          otpMobileLast4: action.last4,
        },
      };
    case 'START_LOGIN_RESEND_COOLDOWN':
      return {
        ...state,
        login: { ...state.login, resendCooldown: RESEND_COOLDOWN_SEC },
      };
    case 'TICK_LOGIN_RESEND_COOLDOWN': {
      const next = state.login.resendCooldown <= 1 ? 0 : state.login.resendCooldown - 1;
      return { ...state, login: { ...state.login, resendCooldown: next } };
    }
    case 'SET_LOGIN_MODE':
      return { ...state, login: { ...state.login, mode: action.mode } };
    case 'SET_LOGIN_MOBILE':
      return { ...state, login: { ...state.login, mobile: action.mobile } };
    case 'SET_LOGIN_ACCOUNTS':
      return { ...state, login: { ...state.login, accounts: action.accounts } };
    case 'SET_LOGIN_PROFILE_FETCHED':
      return { ...state, login: { ...state.login, profileFetched: action.value } };
    case 'SET_LOGIN_ABHA_ADDRESS':
      return {
        ...state,
        login: {
          ...state.login,
          abhaAddress: action.value,
          abhaAddressError: null,
        },
      };
    case 'SET_LOGIN_ABHA_ADDRESS_ERROR':
      return {
        ...state,
        login: { ...state.login, abhaAddressError: action.error },
      };
    case 'SET_LOGIN_ABHA_ADDRESS_CHANNEL':
      return {
        ...state,
        login: { ...state.login, abhaAddressChannel: action.channel },
      };
    case 'CLEAR_LOGIN_ABHA_ADDRESS':
      return {
        ...state,
        login: { ...state.login, abhaAddress: '', abhaAddressError: null },
      };
    default:
      return null;
  }
}

function reduceAddress(
  state: AbhaWizardState,
  action: AbhaWizardAction,
): AbhaWizardState | null {
  switch (action.type) {
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
          suggestions: [],
          needsMobileVerifyOtp: false,
          mobileVerifyOtp: '',
          addressLocal: '',
          addressError: null,
        },
      };
    default:
      return null;
  }
}

const SLICE_REDUCERS = [
  reduceLifecycle,
  reduceAadhaar,
  reduceConsent,
  reduceOtpSession,
  reduceLogin,
  reduceAddress,
];

export function abhaWizardReducer(
  state: AbhaWizardState,
  action: AbhaWizardAction,
): AbhaWizardState {
  for (const reduce of SLICE_REDUCERS) {
    const next = reduce(state, action);
    if (next !== null) return next;
  }
  return state;
}
