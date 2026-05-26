import { useCallback, useEffect, useMemo, useReducer } from 'react';
import { toast } from 'sonner';
import {
  confirmMobileVerifyOtp,
  createAbhaAddress,
  getAbhaAddressSuggestions,
  getAbhaProfile,
  resendAadhaarOtp,
  sendAadhaarOtp,
  sendMobileVerifyOtp,
  verifyAadhaarOtp,
} from '@/features/abha/api/m1-enrolment';
import type { AbhaCreatedPayload, EnrolAadhaarVerifyResponse, ProfileAccountResponse } from '@/features/abha/types';
import { ABHA_ADDRESS_SUFFIX, CONSENT_ITEMS, MAX_OTP_SENDS } from './constants';
import { abhaWizardReducer, createInitialAbhaWizardState } from './reducer';
import type { AbhaWizardState } from './types';
import {
  extractMobileLast4FromMessage,
  formatMaskedMobileLast4,
  validateAbhaAddressLocal,
} from '@/features/abha/utils/abha-address-validation';
import {
  mapAbhaProfileDisplay,
  mapAbhaProfileToFormPrefill,
} from '@/features/abha/utils/map-abha-profile';
import { ApiError } from '@/lib/api-client';
import { mutationErrorMessage } from '@/lib/mutation-error';

function isConflictError(err: unknown): boolean {
  return err instanceof ApiError && err.status === 409;
}

export interface UseAbhaWizardParams {
  open: boolean;
  authDisplayName: string;
  onSuccess: (payload: AbhaCreatedPayload) => void;
  onOpenChange: (open: boolean) => void;
}

function computeDerived(state: AbhaWizardState) {
  const { aadhaar, consent, otpSession, address, isSubmitting } = state;
  const fullAadhaar = `${aadhaar.seg1}${aadhaar.seg2}${aadhaar.seg3}`;

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

  const addressLocalValid = validateAbhaAddressLocal(address.addressLocal) === null;

  return {
    fullAadhaar,
    allConsentsChecked,
    consentStepValid,
    otpStepValid,
    resendAttemptsLeft,
    canResendOtp,
    otpMaskedLabel,
    addressLocalValid,
    resendCooldown: otpSession.resendCooldown,
  };
}

export function useAbhaWizard({
  open,
  authDisplayName,
  onSuccess,
  onOpenChange,
}: UseAbhaWizardParams) {
  const [state, dispatch] = useReducer(abhaWizardReducer, undefined, createInitialAbhaWizardState);

  const derived = useMemo(() => computeDerived(state), [state]);

  useEffect(() => {
    if (open) {
      dispatch({ type: 'SET_HEALTHCARE_WORKER_NAME', name: authDisplayName });
    } else {
      dispatch({ type: 'RESET' });
    }
  }, [open, authDisplayName]);

  const cooldownActive = state.otpSession.resendCooldown > 0;
  useEffect(() => {
    if (!cooldownActive) return;
    const id = window.setInterval(() => dispatch({ type: 'TICK_RESEND_COOLDOWN' }), 1000);
    return () => window.clearInterval(id);
  }, [cooldownActive]);

  const showOtpSentToast = useCallback((message: string, fallbackLast4: string) => {
    const last4 = extractMobileLast4FromMessage(message) ?? fallbackLast4;
    dispatch({ type: 'SET_OTP_MOBILE_LAST4', last4 });
    toast.success('OTP Sent', {
      description: `OTP sent to Aadhaar registered mobile number ending with ******${last4}`,
    });
  }, []);

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

  const applySuccessAndClose = useCallback(
    async (prefetched?: ProfileAccountResponse) => {
      const sid = state.otpSession.sessionId;
      if (!sid) return;
      const profileRes = prefetched ?? state.profileAccount ?? (await getAbhaProfile(sid));
      const prefill = mapAbhaProfileToFormPrefill(
        profileRes.profile,
        state.verifySnapshot ?? undefined,
      );
      onSuccess(prefill);
      onOpenChange(false);
    },
    [state.otpSession.sessionId, state.profileAccount, state.verifySnapshot, onSuccess, onOpenChange],
  );

  const finishWithPrefill = useCallback(async () => {
    dispatch({ type: 'SET_SUBMITTING', isSubmitting: true });
    try {
      await applySuccessAndClose();
    } catch (err) {
      toast.error(mutationErrorMessage(err));
    } finally {
      dispatch({ type: 'SET_SUBMITTING', isSubmitting: false });
    }
  }, [applySuccessAndClose]);

  const loadAddressSuggestions = useCallback(async (sid: string) => {
    const res = await getAbhaAddressSuggestions(sid);
    dispatch({ type: 'SET_ADDRESS_SUGGESTIONS', suggestions: res.suggestions });
    return res;
  }, []);

  const ensureMobileVerifiedForAddress = useCallback(
    async (sid: string, mobileDigits: string): Promise<boolean> => {
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
    [loadAddressSuggestions],
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
    if (state.step === 'login-soon' || state.step === 'consent') {
      dispatch({ type: 'SET_STEP', step: 'method' });
    } else if (state.step === 'otp') {
      dispatch({ type: 'SET_STEP', step: 'consent' });
    } else if (state.step === 'address-edit') {
      dispatch({ type: 'RESET_ADDRESS_EDIT' });
    }
  }, [state.isSubmitting, state.step]);

  const handleConsentNext = useCallback(async () => {
    if (!derived.consentStepValid || state.isSubmitting) return;
    dispatch({ type: 'SET_SUBMITTING', isSubmitting: true });
    try {
      const res = await sendAadhaarOtp(derived.fullAadhaar);
      dispatch({ type: 'INIT_OTP_SESSION', sessionId: res.sessionId, aadhaarNumber: derived.fullAadhaar });
      dispatch({ type: 'OTP_SENT' });
      dispatch({ type: 'START_RESEND_COOLDOWN' });
      dispatch({ type: 'SET_STEP', step: 'otp' });
      showOtpSentToast(res.message, derived.fullAadhaar.slice(-4));
    } catch (err) {
      toast.error(mutationErrorMessage(err));
    } finally {
      dispatch({ type: 'SET_SUBMITTING', isSubmitting: false });
    }
  }, [derived.consentStepValid, derived.fullAadhaar, state.isSubmitting, showOtpSentToast]);

  const handleResendOtp = useCallback(async () => {
    const { sessionId, aadhaarNumber } = state.otpSession;
    if (!derived.canResendOtp || !sessionId || !aadhaarNumber) return;
    dispatch({ type: 'SET_SUBMITTING', isSubmitting: true });
    try {
      const res = await resendAadhaarOtp(sessionId, aadhaarNumber);
      dispatch({ type: 'OTP_SENT' });
      dispatch({ type: 'START_RESEND_COOLDOWN' });
      showOtpSentToast(res.message, aadhaarNumber.slice(-4));
    } catch (err) {
      toast.error(mutationErrorMessage(err));
    } finally {
      dispatch({ type: 'SET_SUBMITTING', isSubmitting: false });
    }
  }, [derived.canResendOtp, state.otpSession, showOtpSentToast]);

  const handleOtpNext = useCallback(async () => {
    const { sessionId, otp, mobile } = state.otpSession;
    if (!derived.otpStepValid || !sessionId || state.isSubmitting) return;
    dispatch({ type: 'SET_SUBMITTING', isSubmitting: true });
    try {
      const verifyRes = await verifyAadhaarOtp({ sessionId, otp, mobile });
      dispatch({ type: 'SET_VERIFY_SNAPSHOT', snapshot: verifyRes });
      await refreshProfileState(sessionId, verifyRes);
      dispatch({ type: 'SET_STEP', step: 'profile' });
    } catch (err) {
      toast.error(mutationErrorMessage(err));
    } finally {
      dispatch({ type: 'SET_SUBMITTING', isSubmitting: false });
    }
  }, [derived.otpStepValid, state.isSubmitting, state.otpSession, refreshProfileState]);

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
  }, [applySuccessAndClose, state.address.addressLocal, state.isSubmitting, state.otpSession, state.verifySnapshot]);

  const handleDone = useCallback(() => {
    void finishWithPrefill();
  }, [finishWithPrefill]);

  return {
    state,
    dispatch,
    derived,
    handlers: {
      handleOpenChange,
      handleBack,
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
