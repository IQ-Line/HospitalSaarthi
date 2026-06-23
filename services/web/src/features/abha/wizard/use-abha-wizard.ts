import { useCallback, useEffect, useMemo, useReducer } from 'react';
import { toast } from 'sonner';
import {
  confirmMobileVerifyOtp,
  confirmVerifyAbhaAddress,
  confirmVerifyAbhaNumber,
  confirmVerifyAbhaNumberUser,
  createAbhaAddress,
  getAbhaAddressSuggestions,
  getAbhaProfile,
  resendAadhaarOtp,
  sendAadhaarOtp,
  sendLoginAadhaarOtp,
  sendLoginAbhaNumberOtp,
  sendLoginMobileOtp,
  sendMobileVerifyOtp,
  sendVerifyAbhaAddressOtp,
  sendVerifyAbhaNumberOtp,
  verifyAadhaarOtp,
  verifyLoginOtp,
  verifyLoginUser,
} from '@/features/abha/api/m1-enrolment';
import {
  abhaNumberFromSegments,
  isAbhaNumberComplete,
} from '@/features/abha/components/abha-number-segment-input';
import type {
  AbhaCreatedPayload,
  EnrolAadhaarVerifyResponse,
  LoginAbhaNumberOtpResponse,
  LoginOtpChannel,
  ProfileAccountResponse,
  VerifyAbhaAddressChannel,
} from '@/features/abha/types';
import type { AbhaWizardFlow } from './types';
import { ABHA_ADDRESS_SUFFIX, CONSENT_ITEMS, MAX_OTP_SENDS } from './constants';
import { abhaWizardReducer, createInitialAbhaWizardState } from './reducer';
import type { AbhaWizardAction, AbhaWizardState, LoginMode } from './types';
import {
  extractMobileLast4FromMessage,
  formatMaskedMobileLast4,
  fullAbhaAddressFromLocal,
  validateAbhaAddressLocal,
} from '@/features/abha/utils/abha-address-validation';
import {
  mapAbhaProfileDisplay,
  mapAbhaProfileToFormPrefill,
} from '@/features/abha/utils/map-abha-profile';
import {
  isClientInvalidAadhaar,
  MSG_VALID_AADHAAR,
  MSG_VALID_ABHA_NUMBER,
  resolveAadhaarWizardError,
  resolveAbhaNumberWizardError,
} from '@/features/abha/utils/abha-user-errors';
import { ApiError } from '@/lib/api-client';
import { mutationErrorMessage } from '@/lib/mutation-error';

function isConflictError(err: unknown): boolean {
  return err instanceof ApiError && err.status === 409;
}

const goTo = (next: AbhaWizardState['step']): AbhaWizardAction => ({ type: 'SET_STEP', step: next });

// Back-navigation from `login-otp` depends on which login mode produced the OTP.
function loginOtpBackActions(mode: LoginMode | null): AbhaWizardAction[] {
  if (mode === 'mobile') return [goTo('login-mobile')];
  if (mode === 'aadhaar') return [goTo('consent')];
  if (mode === 'abha-address') return [goTo('login-abha-address-channel')];
  return [goTo('login-abha-channel')];
}

// Pure mapping from the current wizard state to the reducer action(s) the Back
// button should dispatch. Returns [] when the current step has no Back target.
// The caller still owns the `isSubmitting` guard and the actual dispatching.
function computeBackActions(state: AbhaWizardState): AbhaWizardAction[] {
  const { login, consent, address } = state;
  switch (state.step) {
    case 'login-abha-channel':
      return [goTo('login-abha-number')];
    case 'login-abha-address-channel':
      return [goTo('login-abha-address')];
    case 'login-abha-number':
    case 'login-abha-address':
      return [goTo('login-method')];
    case 'login-mobile':
      return [goTo('login-method')];
    case 'login-account-select':
      return [goTo('login-otp')];
    case 'login-otp':
      return loginOtpBackActions(login.mode);
    case 'login-method':
      return [goTo('method')];
    case 'consent':
      return consent.isLoginAadhaarConsent
        ? [{ type: 'SET_LOGIN_AADHAAR_CONSENT', value: false }, goTo('login-method')]
        : [goTo('method')];
    case 'otp':
      return [goTo('consent')];
    case 'address-edit':
      return address.needsMobileVerifyOtp && address.suggestions.length === 0
        ? [goTo('otp')]
        : [{ type: 'RESET_ADDRESS_EDIT' }];
    default:
      return [];
  }
}

export interface UseAbhaWizardParams {
  open: boolean;
  flow: AbhaWizardFlow;
  authDisplayName: string;
  onSuccess: (payload: AbhaCreatedPayload) => void;
  onOpenChange: (open: boolean) => void;
}

function computeDerived(state: AbhaWizardState) {
  const { aadhaar, consent, otpSession, login, address, isSubmitting, flow, step } = state;
  const fullAadhaar = `${aadhaar.seg1}${aadhaar.seg2}${aadhaar.seg3}`;
  const isFrontdeskVerify = flow === 'verify';

  const allConsentsChecked =
    CONSENT_ITEMS.every((_, i) => consent.checked[i] === true) &&
    consent.hwAcknowledged &&
    consent.beneficiaryAcknowledged;

  const consentStepValid =
    /^\d{12}$/.test(fullAadhaar) &&
    allConsentsChecked &&
    consent.healthcareWorkerName.trim().length > 0 &&
    consent.beneficiaryName.trim().length > 0;

  const otpStepValid = /^\d{6}$/.test(otpSession.otp) && /^\d{10}$/.test(otpSession.mobile);
  const resendAttemptsLeft = MAX_OTP_SENDS - otpSession.sendCount;
  const canResendOtp =
    otpSession.resendCooldown === 0 && resendAttemptsLeft > 0 && !isSubmitting;

  const otpMaskedLabel = otpSession.otpMobileLast4
    ? formatMaskedMobileLast4(otpSession.otpMobileLast4)
    : formatMaskedMobileLast4(fullAadhaar.slice(-4));

  const loginAbhaNumberValid = isAbhaNumberComplete(login.abhaSegments);
  const loginAbhaNumberDigits = abhaNumberFromSegments(login.abhaSegments);
  const loginMobileValid = /^\d{10}$/.test(login.mobile);
  const loginAbhaAddressValid = validateAbhaAddressLocal(login.abhaAddress) === null;
  const loginResendAttemptsLeft = MAX_OTP_SENDS - login.sendCount;
  const canResendLoginOtp =
    login.resendCooldown === 0 && loginResendAttemptsLeft > 0 && !isSubmitting;
  const loginOtpMaskedLabel = login.otpMobileLast4
    ? formatMaskedMobileLast4(login.otpMobileLast4)
    : 'your registered mobile';

  const isVerifyTitle =
    step.startsWith('login-') ||
    (step === 'consent' && consent.isLoginAadhaarConsent) ||
    (flow === 'verify' && step === 'login-method');

  return {
    fullAadhaar,
    allConsentsChecked,
    consentStepValid,
    otpStepValid,
    resendAttemptsLeft,
    canResendOtp,
    otpMaskedLabel,
    addressLocalValid: validateAbhaAddressLocal(address.addressLocal) === null,
    loginAbhaNumberValid,
    loginAbhaNumberDigits,
    loginMobileValid,
    loginAbhaAddressValid,
    loginResendAttemptsLeft,
    canResendLoginOtp,
    loginOtpMaskedLabel,
    isVerifyTitle,
    isFrontdeskVerify,
  };
}

type AbhaWizardDerived = ReturnType<typeof computeDerived>;

// Picks the resend request for the active login mode, validating mode-specific
// preconditions. Returns a thunk that issues the request, or null when the
// current mode/inputs are not in a resendable state (caller should bail out).
function buildLoginResendRequest(
  mode: LoginMode,
  login: AbhaWizardState['login'],
  derived: AbhaWizardDerived,
): (() => Promise<LoginAbhaNumberOtpResponse>) | null {
  if (mode === 'abha-number') {
    if (!login.channel || !derived.loginAbhaNumberValid) return null;
    const channel = login.channel;
    return () =>
      derived.isFrontdeskVerify
        ? sendVerifyAbhaNumberOtp({ abhaNumber: derived.loginAbhaNumberDigits, channel })
        : sendLoginAbhaNumberOtp({ abhaNumber: derived.loginAbhaNumberDigits, channel });
  }
  if (mode === 'abha-address') {
    if (!login.abhaAddressChannel || !derived.loginAbhaAddressValid) return null;
    const channel = login.abhaAddressChannel;
    return () =>
      sendVerifyAbhaAddressOtp({
        abhaAddress: fullAbhaAddressFromLocal(login.abhaAddress, ABHA_ADDRESS_SUFFIX),
        channel,
      });
  }
  if (mode === 'mobile') {
    if (!derived.loginMobileValid) return null;
    return () => sendLoginMobileOtp(login.mobile);
  }
  if (!/^\d{12}$/.test(derived.fullAadhaar)) return null;
  return () => sendLoginAadhaarOtp(derived.fullAadhaar);
}

export function useAbhaWizard({
  open,
  flow,
  authDisplayName,
  onSuccess,
  onOpenChange,
}: UseAbhaWizardParams) {
  const [state, dispatch] = useReducer(
    abhaWizardReducer,
    flow,
    createInitialAbhaWizardState,
  );

  const derived = useMemo(() => computeDerived(state), [state]);

  useEffect(() => {
    if (open) {
      dispatch({ type: 'OPEN', flow, healthcareWorkerName: authDisplayName });
    } else {
      dispatch({ type: 'RESET' });
    }
  }, [open, flow, authDisplayName]);

  const enrolCooldownActive = state.otpSession.resendCooldown > 0;
  useEffect(() => {
    if (!enrolCooldownActive) return;
    const id = window.setInterval(() => dispatch({ type: 'TICK_RESEND_COOLDOWN' }), 1000);
    return () => window.clearInterval(id);
  }, [enrolCooldownActive]);

  const loginCooldownActive = state.login.resendCooldown > 0;
  useEffect(() => {
    if (!loginCooldownActive) return;
    const id = window.setInterval(() => dispatch({ type: 'TICK_LOGIN_RESEND_COOLDOWN' }), 1000);
    return () => window.clearInterval(id);
  }, [loginCooldownActive]);

  const showEnrolOtpToast = useCallback((message: string, fallbackLast4: string) => {
    const last4 = extractMobileLast4FromMessage(message) ?? fallbackLast4;
    dispatch({ type: 'SET_OTP_MOBILE_LAST4', last4 });
    toast.success('OTP Sent', {
      description: `OTP sent to Aadhaar registered mobile number ending with ******${last4}`,
    });
  }, []);

  const toastLoginOtpSent = useCallback((last4: string) => {
    toast.success('OTP Sent', {
      description: `OTP sent to mobile number ending with ******${last4}`,
    });
  }, []);

  const reportAadhaarFieldError = useCallback((message: string) => {
    dispatch({ type: 'SET_AADHAAR_ERROR', error: message });
    toast.error('Error', { description: message });
  }, []);

  const failAadhaarOtpRequest = useCallback(
    (fullAadhaar: string, err?: unknown) => {
      if (isClientInvalidAadhaar(fullAadhaar)) {
        reportAadhaarFieldError(MSG_VALID_AADHAAR);
        return;
      }
      const message = err !== undefined ? resolveAadhaarWizardError(err) : MSG_VALID_AADHAAR;
      if (message === MSG_VALID_AADHAAR) {
        reportAadhaarFieldError(message);
        return;
      }
      toast.error('Error', { description: message });
    },
    [reportAadhaarFieldError],
  );

  const failAbhaNumberOtpRequest = useCallback((err: unknown) => {
    const message = resolveAbhaNumberWizardError(err);
    if (message === MSG_VALID_ABHA_NUMBER) {
      dispatch({ type: 'SET_LOGIN_ABHA_NUMBER_ERROR', error: message });
    }
    toast.error('Error', { description: message });
  }, []);

  const enterLoginOtpStep = useCallback(
    (message: string, fallbackLast4: string) => {
      const last4 = extractMobileLast4FromMessage(message) ?? fallbackLast4;
      dispatch({ type: 'BEGIN_LOGIN_OTP', last4 });
      dispatch({ type: 'SET_STEP', step: 'login-otp' });
      toastLoginOtpSent(last4);
    },
    [toastLoginOtpSent],
  );

  const refreshProfileState = useCallback(
    async (sid: string, verify?: EnrolAadhaarVerifyResponse) => {
      const profileRes = await getAbhaProfile(sid);
      dispatch({
        type: 'SET_PROFILE_DISPLAY',
        profileDisplay: mapAbhaProfileDisplay(profileRes.profile, verify),
        profileAccount: profileRes,
      });
      return profileRes;
    },
    [],
  );

  const finishLoginWithProfile = useCallback(
    async (sid: string) => {
      if (state.login.profileFetched) return;
      const profileRes = await getAbhaProfile(sid);
      dispatch({ type: 'SET_LOGIN_PROFILE_FETCHED', value: true });
      const display = mapAbhaProfileDisplay(profileRes.profile);
      onSuccess({
        ...mapAbhaProfileToFormPrefill(profileRes.profile),
        sessionId: sid,
        abhaNumber: display.abhaNumber,
        abhaAddress: display.abhaAddress,
      });
      onOpenChange(false);
    },
    [state.login.profileFetched, onSuccess, onOpenChange],
  );

  const applySuccessAndClose = useCallback(
    async (prefetched?: ProfileAccountResponse) => {
      const sid = state.otpSession.sessionId;
      if (!sid) return;
      const profileRes = prefetched ?? state.profileAccount ?? (await getAbhaProfile(sid));
      const display = mapAbhaProfileDisplay(
        profileRes.profile,
        state.verifySnapshot ?? undefined,
      );
      onSuccess({
        ...mapAbhaProfileToFormPrefill(profileRes.profile, state.verifySnapshot ?? undefined),
        sessionId: sid,
        abhaNumber: display.abhaNumber,
        abhaAddress: display.abhaAddress,
      });
      onOpenChange(false);
    },
    [state.otpSession.sessionId, state.profileAccount, state.verifySnapshot, onSuccess, onOpenChange],
  );

  const confirmAuthOtp = useCallback(
    (sid: string, otp: string) => {
      const { mode } = state.login;
      if (mode === 'abha-address') {
        return confirmVerifyAbhaAddress({ sessionId: sid, otp });
      }
      if (derived.isFrontdeskVerify && mode === 'abha-number') {
        return confirmVerifyAbhaNumber({ sessionId: sid, otp });
      }
      return verifyLoginOtp({ sessionId: sid, otp });
    },
    [derived.isFrontdeskVerify, state.login.mode],
  );

  const confirmAuthUser = useCallback(
    (sid: string, abhaNumber: string) => {
      if (derived.isFrontdeskVerify && state.login.mode === 'abha-number') {
        return confirmVerifyAbhaNumberUser({ sessionId: sid, abhaNumber });
      }
      return verifyLoginUser({ sessionId: sid, abhaNumber });
    },
    [derived.isFrontdeskVerify, state.login.mode],
  );

  const loadAddressSuggestions = useCallback(async (sid: string) => {
    const res = await getAbhaAddressSuggestions(sid);
    dispatch({ type: 'SET_ADDRESS_SUGGESTIONS', suggestions: res.suggestions });
    return res;
  }, []);

  const ensureMobileVerifiedForAddress = useCallback(
    async (sid: string, mobileDigits: string): Promise<boolean> => {
      if (state.verifySnapshot?.mobileVerifySkipped === true) {
        await loadAddressSuggestions(sid);
        return false;
      }
      try {
        await loadAddressSuggestions(sid);
        return false;
      } catch (err) {
        if (!isConflictError(err)) throw err;
      }
      await sendMobileVerifyOtp({ sessionId: sid, mobile: mobileDigits });
      toast.info('Enter the OTP sent to your mobile to continue with ABHA address setup.');
      return true;
    },
    [loadAddressSuggestions, state.verifySnapshot?.mobileVerifySkipped],
  );

  const handleOpenChange = useCallback(
    (next: boolean) => {
      if (!next && state.isSubmitting) return;
      onOpenChange(next);
    },
    [state.isSubmitting, onOpenChange],
  );

  const handleBack = useCallback(() => {
    if (state.isSubmitting) return;
    for (const action of computeBackActions(state)) dispatch(action);
  }, [state.address.needsMobileVerifyOtp, state.address.suggestions.length, state.isSubmitting, state.step, state.login, state.consent]);

  const handleLoginMethodSelect = useCallback((methodId: string) => {
    if (methodId === 'abha-number') {
      dispatch({ type: 'SET_STEP', step: 'login-abha-number' });
      return;
    }
    if (methodId === 'abha-address') {
      dispatch({ type: 'CLEAR_LOGIN_ABHA_ADDRESS' });
      dispatch({ type: 'SET_STEP', step: 'login-abha-address' });
      return;
    }
    if (methodId === 'mobile') {
      dispatch({ type: 'SET_LOGIN_MOBILE', mobile: '' });
      dispatch({ type: 'SET_STEP', step: 'login-mobile' });
      return;
    }
    if (methodId === 'aadhaar') {
      dispatch({ type: 'SET_LOGIN_AADHAAR_CONSENT', value: true });
      dispatch({ type: 'SET_STEP', step: 'consent' });
    }
  }, []);

  const handleLoginChannelSelect = useCallback(
    async (channel: LoginOtpChannel) => {
      if (!derived.loginAbhaNumberValid || state.isSubmitting) return;
      dispatch({ type: 'SET_SUBMITTING', isSubmitting: true });
      try {
        const res = derived.isFrontdeskVerify
          ? await sendVerifyAbhaNumberOtp({
              abhaNumber: derived.loginAbhaNumberDigits,
              channel,
            })
          : await sendLoginAbhaNumberOtp({
              abhaNumber: derived.loginAbhaNumberDigits,
              channel,
            });
        dispatch({ type: 'INIT_OTP_SESSION', sessionId: res.sessionId });
        dispatch({ type: 'SET_LOGIN_MODE', mode: 'abha-number' });
        dispatch({ type: 'SET_LOGIN_CHANNEL', channel });
        enterLoginOtpStep(res.message, derived.loginAbhaNumberDigits.slice(-4));
      } catch (err) {
        failAbhaNumberOtpRequest(err);
      } finally {
        dispatch({ type: 'SET_SUBMITTING', isSubmitting: false });
      }
    },
    [
      derived.isFrontdeskVerify,
      derived.loginAbhaNumberDigits,
      derived.loginAbhaNumberValid,
      enterLoginOtpStep,
      failAbhaNumberOtpRequest,
      state.isSubmitting,
    ],
  );

  const handleLoginAbhaAddressChannelSelect = useCallback(
    async (channel: VerifyAbhaAddressChannel) => {
      if (!derived.loginAbhaAddressValid || state.isSubmitting) return;
      dispatch({ type: 'SET_SUBMITTING', isSubmitting: true });
      try {
        const abhaAddress = fullAbhaAddressFromLocal(
          state.login.abhaAddress,
          ABHA_ADDRESS_SUFFIX,
        );
        const res = await sendVerifyAbhaAddressOtp({ abhaAddress, channel });
        dispatch({ type: 'INIT_OTP_SESSION', sessionId: res.sessionId });
        dispatch({ type: 'SET_LOGIN_MODE', mode: 'abha-address' });
        dispatch({ type: 'SET_LOGIN_ABHA_ADDRESS_CHANNEL', channel });
        enterLoginOtpStep(
          res.message,
          abhaAddress.replace(/\D/g, '').slice(-4) || '0000',
        );
      } catch (err) {
        toast.error(mutationErrorMessage(err));
      } finally {
        dispatch({ type: 'SET_SUBMITTING', isSubmitting: false });
      }
    },
    [derived.loginAbhaAddressValid, enterLoginOtpStep, state.isSubmitting, state.login.abhaAddress],
  );

  const handleLoginAbhaAddressNext = useCallback(() => {
    const err = validateAbhaAddressLocal(state.login.abhaAddress);
    if (err) {
      dispatch({ type: 'SET_LOGIN_ABHA_ADDRESS_ERROR', error: err });
      return;
    }
    dispatch({ type: 'SET_LOGIN_ABHA_ADDRESS_ERROR', error: null });
    dispatch({ type: 'SET_STEP', step: 'login-abha-address-channel' });
  }, [state.login.abhaAddress]);

  const handleLoginOtpVerify = useCallback(async () => {
    const { sessionId } = state.otpSession;
    const { otp, mode } = state.login;
    if (!/^\d{6}$/.test(otp) || !sessionId || state.isSubmitting) return;
    dispatch({ type: 'SET_SUBMITTING', isSubmitting: true });
    try {
      const verifyRes = await confirmAuthOtp(sessionId, otp);
      if (verifyRes.authResult === 'failed') {
        toast.error('Invalid OTP. Please try again.');
        return;
      }
      if (
        verifyRes.needsUserSelection &&
        verifyRes.accounts &&
        verifyRes.accounts.length > 0 &&
        mode !== 'abha-address'
      ) {
        dispatch({ type: 'SET_LOGIN_ACCOUNTS', accounts: verifyRes.accounts });
        dispatch({ type: 'SET_STEP', step: 'login-account-select' });
        return;
      }
      await finishLoginWithProfile(sessionId);
    } catch (err) {
      toast.error(mutationErrorMessage(err));
    } finally {
      dispatch({ type: 'SET_SUBMITTING', isSubmitting: false });
    }
  }, [confirmAuthOtp, finishLoginWithProfile, state.isSubmitting, state.login, state.otpSession]);

  const handleLoginAccountSelect = useCallback(
    async (abhaNumber: string) => {
      const { sessionId } = state.otpSession;
      if (!sessionId || state.isSubmitting) return;
      dispatch({ type: 'SET_SUBMITTING', isSubmitting: true });
      try {
        await confirmAuthUser(sessionId, abhaNumber);
        await finishLoginWithProfile(sessionId);
      } catch (err) {
        toast.error(mutationErrorMessage(err));
      } finally {
        dispatch({ type: 'SET_SUBMITTING', isSubmitting: false });
      }
    },
    [confirmAuthUser, finishLoginWithProfile, state.isSubmitting, state.otpSession],
  );

  const handleLoginMobileNext = useCallback(async () => {
    if (!derived.loginMobileValid || state.isSubmitting) return;
    dispatch({ type: 'SET_SUBMITTING', isSubmitting: true });
    try {
      const res = await sendLoginMobileOtp(state.login.mobile);
      dispatch({ type: 'INIT_OTP_SESSION', sessionId: res.sessionId });
      dispatch({ type: 'SET_LOGIN_MODE', mode: 'mobile' });
      enterLoginOtpStep(res.message, state.login.mobile.slice(-4));
    } catch (err) {
      toast.error(mutationErrorMessage(err));
    } finally {
      dispatch({ type: 'SET_SUBMITTING', isSubmitting: false });
    }
  }, [derived.loginMobileValid, enterLoginOtpStep, state.isSubmitting, state.login.mobile]);

  const handleLoginAadhaarOtpSend = useCallback(async () => {
    if (!derived.consentStepValid || state.isSubmitting) return;
    if (isClientInvalidAadhaar(derived.fullAadhaar)) {
      failAadhaarOtpRequest(derived.fullAadhaar);
      return;
    }
    dispatch({ type: 'SET_AADHAAR_ERROR', error: null });
    dispatch({ type: 'SET_SUBMITTING', isSubmitting: true });
    try {
      const res = await sendLoginAadhaarOtp(derived.fullAadhaar);
      dispatch({ type: 'INIT_OTP_SESSION', sessionId: res.sessionId });
      dispatch({ type: 'SET_LOGIN_MODE', mode: 'aadhaar' });
      enterLoginOtpStep(res.message, derived.fullAadhaar.slice(-4));
    } catch (err) {
      failAadhaarOtpRequest(derived.fullAadhaar, err);
    } finally {
      dispatch({ type: 'SET_SUBMITTING', isSubmitting: false });
    }
  }, [
    derived.consentStepValid,
    derived.fullAadhaar,
    enterLoginOtpStep,
    failAadhaarOtpRequest,
    state.isSubmitting,
  ]);

  const handleLoginResendOtp = useCallback(async () => {
    const { mode } = state.login;
    if (!derived.canResendLoginOtp || !mode || state.isSubmitting) return;
    dispatch({ type: 'SET_SUBMITTING', isSubmitting: true });
    try {
      const request = buildLoginResendRequest(mode, state.login, derived);
      if (!request) return;
      const res = await request();
      dispatch({ type: 'SET_OTP_SESSION_ID', sessionId: res.sessionId });
      dispatch({ type: 'LOGIN_OTP_SENT' });
      dispatch({ type: 'START_LOGIN_RESEND_COOLDOWN' });
      const last4 =
        extractMobileLast4FromMessage(res.message) ?? state.login.otpMobileLast4;
      dispatch({ type: 'SET_LOGIN_OTP_MOBILE_LAST4', last4 });
      toast.success('OTP Sent', {
        description: `OTP sent to mobile number ending with ******${last4}`,
      });
    } catch (err) {
      if (mode === 'aadhaar') {
        failAadhaarOtpRequest(derived.fullAadhaar, err);
      } else if (mode === 'abha-number') {
        failAbhaNumberOtpRequest(err);
      } else {
        toast.error('Error', { description: mutationErrorMessage(err) });
      }
    } finally {
      dispatch({ type: 'SET_SUBMITTING', isSubmitting: false });
    }
  }, [
    derived.canResendLoginOtp,
    derived.fullAadhaar,
    failAadhaarOtpRequest,
    failAbhaNumberOtpRequest,
    derived.isFrontdeskVerify,
    derived.loginAbhaAddressValid,
    derived.loginAbhaNumberDigits,
    derived.loginAbhaNumberValid,
    derived.loginMobileValid,
    state.isSubmitting,
    state.login,
  ]);

  const handleConsentNext = useCallback(async () => {
    if (!derived.consentStepValid || state.isSubmitting) return;
    if (state.consent.isLoginAadhaarConsent) {
      await handleLoginAadhaarOtpSend();
      return;
    }
    if (isClientInvalidAadhaar(derived.fullAadhaar)) {
      failAadhaarOtpRequest(derived.fullAadhaar);
      return;
    }
    dispatch({ type: 'SET_AADHAAR_ERROR', error: null });
    dispatch({ type: 'SET_SUBMITTING', isSubmitting: true });
    try {
      const res = await sendAadhaarOtp(derived.fullAadhaar);
      dispatch({
        type: 'INIT_OTP_SESSION',
        sessionId: res.sessionId,
        aadhaarNumber: derived.fullAadhaar,
      });
      dispatch({ type: 'OTP_SENT' });
      dispatch({ type: 'START_RESEND_COOLDOWN' });
      dispatch({ type: 'SET_STEP', step: 'otp' });
      showEnrolOtpToast(res.message, derived.fullAadhaar.slice(-4));
    } catch (err) {
      failAadhaarOtpRequest(derived.fullAadhaar, err);
    } finally {
      dispatch({ type: 'SET_SUBMITTING', isSubmitting: false });
    }
  }, [
    derived.consentStepValid,
    derived.fullAadhaar,
    failAadhaarOtpRequest,
    handleLoginAadhaarOtpSend,
    showEnrolOtpToast,
    state.consent.isLoginAadhaarConsent,
    state.isSubmitting,
  ]);

  const handleResendOtp = useCallback(async () => {
    const { sessionId, aadhaarNumber } = state.otpSession;
    if (!derived.canResendOtp || !sessionId || !aadhaarNumber) return;
    dispatch({ type: 'SET_SUBMITTING', isSubmitting: true });
    try {
      const res = await resendAadhaarOtp(sessionId, aadhaarNumber);
      dispatch({ type: 'OTP_SENT' });
      dispatch({ type: 'START_RESEND_COOLDOWN' });
      showEnrolOtpToast(res.message, aadhaarNumber.slice(-4));
    } catch (err) {
      failAadhaarOtpRequest(aadhaarNumber, err);
    } finally {
      dispatch({ type: 'SET_SUBMITTING', isSubmitting: false });
    }
  }, [
    derived.canResendOtp,
    failAadhaarOtpRequest,
    showEnrolOtpToast,
    state.otpSession,
    state.isSubmitting,
  ]);

  const handleOtpNext = useCallback(async () => {
    const { sessionId, otp, mobile, aadhaarLinkedMobile } = state.otpSession;
    if (!derived.otpStepValid || !sessionId || state.isSubmitting) return;

    dispatch({ type: 'SET_SUBMITTING', isSubmitting: true });
    try {
      const verifyRes = await verifyAadhaarOtp({
        sessionId,
        otp,
        mobile,
        useAadhaarLinkedMobile: aadhaarLinkedMobile,
      });
      dispatch({ type: 'SET_VERIFY_SNAPSHOT', snapshot: verifyRes });
      await refreshProfileState(sessionId, verifyRes);

      if (verifyRes.mobileVerifySkipped) {
        try {
          await loadAddressSuggestions(sessionId);
        } catch (err) {
          if (!isConflictError(err)) throw err;
        }
        dispatch({ type: 'SET_STEP', step: 'profile' });
        return;
      }

      await sendMobileVerifyOtp({ sessionId, mobile });
      dispatch({ type: 'SET_NEEDS_MOBILE_VERIFY_OTP', needs: true });
      toast.info('Enter the OTP sent to your mobile to continue with ABHA setup.');
      dispatch({ type: 'SET_STEP', step: 'address-edit' });
    } catch (err) {
      toast.error(mutationErrorMessage(err));
    } finally {
      dispatch({ type: 'SET_SUBMITTING', isSubmitting: false });
    }
  }, [
    derived.otpStepValid,
    loadAddressSuggestions,
    refreshProfileState,
    state.isSubmitting,
    state.otpSession,
  ]);

  const handleEditAddress = useCallback(async () => {
    const { sessionId, mobile } = state.otpSession;
    if (!sessionId || !mobile || state.isSubmitting) return;
    dispatch({ type: 'SET_SUBMITTING', isSubmitting: true });
    dispatch({ type: 'SET_ADDRESS_ERROR', error: null });
    try {
      const needsVerify = await ensureMobileVerifiedForAddress(sessionId, mobile);
      dispatch({ type: 'SET_NEEDS_MOBILE_VERIFY_OTP', needs: needsVerify });
      dispatch({ type: 'SET_STEP', step: 'address-edit' });
    } catch (err) {
      toast.error(mutationErrorMessage(err));
    } finally {
      dispatch({ type: 'SET_SUBMITTING', isSubmitting: false });
    }
  }, [ensureMobileVerifiedForAddress, state.isSubmitting, state.otpSession]);

  const handleMobileVerifyForAddress = useCallback(async () => {
    const { sessionId } = state.otpSession;
    const { mobileVerifyOtp } = state.address;
    if (!/^\d{6}$/.test(mobileVerifyOtp) || !sessionId || state.isSubmitting) return;
    dispatch({ type: 'SET_SUBMITTING', isSubmitting: true });
    try {
      await confirmMobileVerifyOtp({ sessionId, otp: mobileVerifyOtp });
      dispatch({ type: 'SET_NEEDS_MOBILE_VERIFY_OTP', needs: false });
      dispatch({ type: 'SET_MOBILE_VERIFY_OTP', otp: '' });
      await loadAddressSuggestions(sessionId);
      toast.success('Mobile verified. Choose or create your ABHA address.');
    } catch (err) {
      toast.error(mutationErrorMessage(err));
    } finally {
      dispatch({ type: 'SET_SUBMITTING', isSubmitting: false });
    }
  }, [loadAddressSuggestions, state.address.mobileVerifyOtp, state.isSubmitting, state.otpSession]);

  const handleCreateAddress = useCallback(async () => {
    const validationError = validateAbhaAddressLocal(state.address.addressLocal);
    if (validationError) {
      dispatch({ type: 'SET_ADDRESS_ERROR', error: validationError });
      return;
    }
    const { sessionId } = state.otpSession;
    if (!sessionId || state.isSubmitting) return;
    dispatch({ type: 'SET_ADDRESS_ERROR', error: null });
    dispatch({ type: 'SET_SUBMITTING', isSubmitting: true });
    try {
      const fullAddress = `${state.address.addressLocal.trim()}${ABHA_ADDRESS_SUFFIX}`;
      await createAbhaAddress({ sessionId, abhaAddress: fullAddress });
      const profileRes = await getAbhaProfile(sessionId);
      dispatch({
        type: 'SET_PROFILE_DISPLAY',
        profileDisplay: mapAbhaProfileDisplay(
          profileRes.profile,
          state.verifySnapshot ?? undefined,
        ),
        profileAccount: profileRes,
      });
      toast.success('ABHA address created');
      await applySuccessAndClose();
    } catch (err) {
      toast.error(mutationErrorMessage(err));
    } finally {
      dispatch({ type: 'SET_SUBMITTING', isSubmitting: false });
    }
  }, [
    applySuccessAndClose,
    state.address.addressLocal,
    state.isSubmitting,
    state.otpSession,
    state.verifySnapshot,
  ]);

  const handleDone = useCallback(async () => {
    dispatch({ type: 'SET_SUBMITTING', isSubmitting: true });
    try {
      await applySuccessAndClose();
    } catch (err) {
      toast.error(mutationErrorMessage(err));
    } finally {
      dispatch({ type: 'SET_SUBMITTING', isSubmitting: false });
    }
  }, [applySuccessAndClose]);

  return {
    state,
    dispatch,
    derived,
    handlers: {
      handleOpenChange,
      handleBack,
      handleLoginMethodSelect,
      handleLoginChannelSelect,
      handleLoginAbhaAddressChannelSelect,
      handleLoginAbhaAddressNext,
      handleLoginOtpVerify,
      handleLoginAccountSelect,
      handleLoginMobileNext,
      handleLoginResendOtp,
      handleConsentNext,
      handleResendOtp,
      handleOtpNext,
      handleEditAddress,
      handleMobileVerifyForAddress,
      handleCreateAddress,
      handleDone,
    },
  };
}
