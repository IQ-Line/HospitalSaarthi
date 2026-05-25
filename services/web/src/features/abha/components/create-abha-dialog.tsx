import { useCallback, useEffect, useMemo, useState } from 'react';
import { InfoIcon, Pencil } from 'lucide-react';
import { toast } from 'sonner';
import { Alert, AlertDescription } from '@pulse/ui/alert';
import { Button } from '@pulse/ui/button';
import { Checkbox } from '@pulse/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@pulse/ui/dialog';
import {
  Field,
  FieldGroup,
  FieldLabel,
} from '@pulse/ui/field';
import { Input } from '@pulse/ui/input';
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from '@pulse/ui/input-otp';
import { Separator } from '@pulse/ui/separator';
import { AadhaarSegmentInput } from '@/features/abha/components/aadhaar-segment-input';
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
import type { AbhaCreatedPayload, AbhaProfileDisplay, EnrolAadhaarVerifyResponse } from '@/features/abha/types';
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
import { useAuthStore } from '@/stores/auth.store';

type WizardStep = 'method' | 'login-soon' | 'consent' | 'otp' | 'profile' | 'address-edit';

const CONSENT_ITEMS = [
  'I am voluntarily sharing my Aadhaar / identity information with the National Health Authority (NHA) for the sole purpose of creation of ABHA number.',
  'I understand that my ABHA number can be used in any healthcare interaction across India.',
  'I consent to NHA using my Aadhaar number for performing Aadhaar based authentication with UIDAI for ABHA number creation.',
  'I authorize NHA to use my Aadhaar number for communicating with me for ABHA number creation.',
  'I consent to linking of my legacy health records with ABHA number.',
  'I consent to sharing my health records with healthcare providers for providing healthcare services.',
  'I consent to anonymization and subsequent use of my health records for public health purposes.',
] as const;

const MAX_OTP_SENDS = 3;
const RESEND_COOLDOWN_SEC = 60;
const ABHA_ADDRESS_SUFFIX = '@sbx';

const WIDE_STEPS = new Set<WizardStep>(['consent', 'otp', 'profile', 'address-edit']);

export interface CreateAbhaDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: (payload: AbhaCreatedPayload) => void;
  /** @deprecated Mobile is not prefilled in the OTP step. */
  defaultMobile?: string;
}

function digitsOnly(value: string, maxLen: number): string {
  return value.replace(/\D/g, '').slice(0, maxLen);
}

function initialConsentState(): Record<number, boolean> {
  return Object.fromEntries(CONSENT_ITEMS.map((_, i) => [i, false]));
}

function isConflictError(err: unknown): boolean {
  return err instanceof ApiError && err.status === 409;
}

function stripAbhaSuffix(address: string): string {
  const at = address.lastIndexOf('@');
  return at > 0 ? address.slice(0, at) : address;
}

export function CreateAbhaDialog({
  open,
  onOpenChange,
  onSuccess,
}: CreateAbhaDialogProps) {
  const authDisplayName = useAuthStore((s) => s.displayName) ?? '';

  const [step, setStep] = useState<WizardStep>('method');
  const [aadhaarSeg1, setAadhaarSeg1] = useState('');
  const [aadhaarSeg2, setAadhaarSeg2] = useState('');
  const [aadhaarSeg3, setAadhaarSeg3] = useState('');
  const [maskSeg1, setMaskSeg1] = useState(false);
  const [maskSeg2, setMaskSeg2] = useState(false);
  const [consentChecked, setConsentChecked] = useState<Record<number, boolean>>(initialConsentState);
  const [hwAcknowledged, setHwAcknowledged] = useState(false);
  const [beneficiaryAcknowledged, setBeneficiaryAcknowledged] = useState(false);
  const [healthcareWorkerName, setHealthcareWorkerName] = useState('');
  const [beneficiaryName, setBeneficiaryName] = useState('');
  const [sessionId, setSessionId] = useState('');
  const [aadhaarNumber, setAadhaarNumber] = useState('');
  const [otp, setOtp] = useState('');
  const [mobile, setMobile] = useState('');
  const [otpMobileLast4, setOtpMobileLast4] = useState('');
  const [otpSendCount, setOtpSendCount] = useState(0);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [profileDisplay, setProfileDisplay] = useState<AbhaProfileDisplay | null>(null);
  const [verifySnapshot, setVerifySnapshot] = useState<EnrolAadhaarVerifyResponse | null>(null);

  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [addressLocal, setAddressLocal] = useState('');
  const [addressError, setAddressError] = useState<string | null>(null);
  const [needsMobileVerifyOtp, setNeedsMobileVerifyOtp] = useState(false);
  const [mobileVerifyOtp, setMobileVerifyOtp] = useState('');

  const resetWizard = useCallback(() => {
    setStep('method');
    setAadhaarSeg1('');
    setAadhaarSeg2('');
    setAadhaarSeg3('');
    setMaskSeg1(false);
    setMaskSeg2(false);
    setConsentChecked(initialConsentState());
    setHwAcknowledged(false);
    setBeneficiaryAcknowledged(false);
    setHealthcareWorkerName('');
    setBeneficiaryName('');
    setSessionId('');
    setAadhaarNumber('');
    setOtp('');
    setMobile('');
    setOtpMobileLast4('');
    setOtpSendCount(0);
    setResendCooldown(0);
    setIsSubmitting(false);
    setProfileDisplay(null);
    setVerifySnapshot(null);
    setSuggestions([]);
    setAddressLocal('');
    setAddressError(null);
    setNeedsMobileVerifyOtp(false);
    setMobileVerifyOtp('');
  }, []);

  useEffect(() => {
    if (open) {
      setHealthcareWorkerName(authDisplayName);
    } else {
      resetWizard();
    }
  }, [open, authDisplayName, resetWizard]);

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const id = window.setInterval(() => {
      setResendCooldown((s) => (s <= 1 ? 0 : s - 1));
    }, 1000);
    return () => window.clearInterval(id);
  }, [resendCooldown]);

  const fullAadhaar = useMemo(
    () => `${aadhaarSeg1}${aadhaarSeg2}${aadhaarSeg3}`,
    [aadhaarSeg1, aadhaarSeg2, aadhaarSeg3],
  );

  const allConsentsChecked = useMemo(
    () =>
      CONSENT_ITEMS.every((_, i) => consentChecked[i] === true) &&
      hwAcknowledged &&
      beneficiaryAcknowledged,
    [consentChecked, hwAcknowledged, beneficiaryAcknowledged],
  );

  const consentStepValid =
    /^\d{12}$/.test(fullAadhaar) &&
    allConsentsChecked &&
    healthcareWorkerName.trim().length > 0 &&
    beneficiaryName.trim().length > 0;

  const otpStepValid = /^\d{6}$/.test(otp) && /^\d{10}$/.test(mobile);
  const resendAttemptsLeft = MAX_OTP_SENDS - otpSendCount;
  const canResendOtp = resendCooldown === 0 && resendAttemptsLeft > 0 && !isSubmitting;

  const otpMaskedLabel = otpMobileLast4
    ? formatMaskedMobileLast4(otpMobileLast4)
    : formatMaskedMobileLast4(fullAadhaar.slice(-4));

  const addressLocalValid = validateAbhaAddressLocal(addressLocal) === null;

  const handleOpenChange = (next: boolean) => {
    if (!next && isSubmitting) return;
    onOpenChange(next);
  };

  const handleSelectAllConsent = (checked: boolean) => {
    setConsentChecked(Object.fromEntries(CONSENT_ITEMS.map((_, i) => [i, checked])));
    setHwAcknowledged(checked);
    setBeneficiaryAcknowledged(checked);
  };

  const startResendCooldown = () => setResendCooldown(RESEND_COOLDOWN_SEC);

  const showOtpSentToast = (message: string, fallbackLast4: string) => {
    const last4 = extractMobileLast4FromMessage(message) ?? fallbackLast4;
    setOtpMobileLast4(last4);
    toast.success('OTP Sent', {
      description: `OTP sent to Aadhaar registered mobile number ending with ******${last4}`,
    });
  };

  const refreshProfileState = async (sid: string, verify?: EnrolAadhaarVerifyResponse) => {
    const profileRes = await getAbhaProfile(sid);
    setProfileDisplay(mapAbhaProfileDisplay(profileRes.profile, verify));
    return profileRes;
  };

  const applySuccessAndClose = async () => {
    if (!sessionId) return;
    const profileRes = await getAbhaProfile(sessionId);
    const prefill = mapAbhaProfileToFormPrefill(profileRes.profile, verifySnapshot ?? undefined);
    onSuccess(prefill);
    onOpenChange(false);
  };

  const finishWithPrefill = async () => {
    setIsSubmitting(true);
    try {
      await applySuccessAndClose();
    } catch (err) {
      toast.error(mutationErrorMessage(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  const loadAddressSuggestions = async (sid: string) => {
    const res = await getAbhaAddressSuggestions(sid);
    setSuggestions(res.suggestions);
    return res;
  };

  const ensureMobileVerifiedForAddress = async (
    sid: string,
    mobileDigits: string,
  ): Promise<boolean> => {
    try {
      await loadAddressSuggestions(sid);
      return false;
    } catch (err) {
      if (!isConflictError(err)) throw err;
    }

    await sendMobileVerifyOtp({ sessionId: sid, mobile: mobileDigits });
    toast.info('Enter the OTP sent to your mobile to continue with ABHA address setup.');
    return true;
  };

  const handleConsentNext = async () => {
    if (!consentStepValid || isSubmitting) return;
    setIsSubmitting(true);
    try {
      const res = await sendAadhaarOtp(fullAadhaar);
      setSessionId(res.sessionId);
      setAadhaarNumber(fullAadhaar);
      setOtpSendCount(1);
      startResendCooldown();
      setStep('otp');
      showOtpSentToast(res.message, fullAadhaar.slice(-4));
    } catch (err) {
      toast.error(mutationErrorMessage(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResendOtp = async () => {
    if (!canResendOtp || !sessionId || !aadhaarNumber) return;
    setIsSubmitting(true);
    try {
      const res = await resendAadhaarOtp(sessionId, aadhaarNumber);
      setOtpSendCount((c) => c + 1);
      startResendCooldown();
      showOtpSentToast(res.message, aadhaarNumber.slice(-4));
    } catch (err) {
      toast.error(mutationErrorMessage(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOtpNext = async () => {
    if (!otpStepValid || !sessionId || isSubmitting) return;
    setIsSubmitting(true);
    try {
      const verifyRes = await verifyAadhaarOtp({ sessionId, otp, mobile });
      setVerifySnapshot(verifyRes);
      await refreshProfileState(sessionId, verifyRes);
      setStep('profile');
    } catch (err) {
      toast.error(mutationErrorMessage(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditAddress = async () => {
    if (!sessionId || !mobile || isSubmitting) return;
    setIsSubmitting(true);
    setAddressError(null);
    try {
      const needsVerify = await ensureMobileVerifiedForAddress(sessionId, mobile);
      setNeedsMobileVerifyOtp(needsVerify);
      setStep('address-edit');
    } catch (err) {
      toast.error(mutationErrorMessage(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleMobileVerifyForAddress = async () => {
    if (!/^\d{6}$/.test(mobileVerifyOtp) || !sessionId || isSubmitting) return;
    setIsSubmitting(true);
    try {
      await confirmMobileVerifyOtp({ sessionId, otp: mobileVerifyOtp });
      setNeedsMobileVerifyOtp(false);
      setMobileVerifyOtp('');
      await loadAddressSuggestions(sessionId);
      toast.success('Mobile verified. Choose or create your ABHA address.');
    } catch (err) {
      toast.error(mutationErrorMessage(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCreateAddress = async () => {
    const validationError = validateAbhaAddressLocal(addressLocal);
    if (validationError) {
      setAddressError(validationError);
      return;
    }
    if (!sessionId || isSubmitting) return;

    setAddressError(null);
    setIsSubmitting(true);
    try {
      const fullAddress = `${addressLocal.trim()}${ABHA_ADDRESS_SUFFIX}`;
      await createAbhaAddress({ sessionId, abhaAddress: fullAddress });
      await refreshProfileState(sessionId, verifySnapshot ?? undefined);
      toast.success('ABHA address created');
      await applySuccessAndClose();
    } catch (err) {
      toast.error(mutationErrorMessage(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDone = () => {
    void finishWithPrefill();
  };

  const handleBack = () => {
    if (isSubmitting) return;
    if (step === 'login-soon' || step === 'consent') setStep('method');
    else if (step === 'otp') setStep('consent');
    else if (step === 'address-edit') {
      setNeedsMobileVerifyOtp(false);
      setMobileVerifyOtp('');
      setAddressLocal('');
      setAddressError(null);
      setStep('profile');
    }
  };

  const showFooter = step !== 'method';
  const showBack = step === 'login-soon' || step === 'consent' || step === 'otp' || step === 'address-edit';

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        className={`flex max-h-[min(92dvh,780px)] w-full max-w-[calc(100%-2rem)] flex-col gap-0 overflow-hidden p-0 ${
          WIDE_STEPS.has(step) ? 'sm:max-w-5xl' : 'sm:max-w-lg'
        }`}
        showCloseButton
      >
        <DialogHeader className="shrink-0 space-y-0 px-6 pb-4 pt-5">
          <DialogTitle className="text-base font-semibold text-foreground">Create ABHA</DialogTitle>
        </DialogHeader>

        <Separator />

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-y-contain px-6 py-5">
          {step === 'method' && (
            <div className="flex min-h-[280px] flex-col items-center justify-center gap-8 py-6 text-center">
              <p className="max-w-xs text-sm leading-relaxed text-muted-foreground">
                Please choose below option to start with the creation of your ABHA
              </p>
              <Button
                type="button"
                variant="outline"
                className="h-12 min-w-[14rem] rounded-md border-2 border-primary/50 bg-background px-8 text-base font-medium text-primary shadow-none hover:border-primary hover:bg-primary/5"
                onClick={() => setStep('consent')}
              >
                Aadhaar Number
              </Button>
              <p className="text-sm text-muted-foreground">
                Already have an ABHA?{' '}
                <button
                  type="button"
                  className="font-semibold text-primary underline-offset-4 hover:underline"
                  onClick={() => setStep('login-soon')}
                >
                  Login
                </button>
              </p>
            </div>
          )}

          {step === 'login-soon' && (
            <div className="flex min-h-[200px] flex-col items-center justify-center py-10 text-center">
              <p className="text-sm text-muted-foreground">
                Login to an existing ABHA will be added soon.
              </p>
            </div>
          )}

          {step === 'consent' && (
            <FieldGroup className="gap-5">
              <Field className="gap-2.5">
                <FieldLabel className="text-sm font-semibold text-foreground">
                  Enter Patient Aadhaar Number
                </FieldLabel>
                <AadhaarSegmentInput
                  seg1={aadhaarSeg1}
                  seg2={aadhaarSeg2}
                  seg3={aadhaarSeg3}
                  maskSeg1={maskSeg1}
                  maskSeg2={maskSeg2}
                  onSeg1Change={setAadhaarSeg1}
                  onSeg2Change={setAadhaarSeg2}
                  onSeg3Change={setAadhaarSeg3}
                  onMaskSeg1={setMaskSeg1}
                  onMaskSeg2={setMaskSeg2}
                />
                <p className="text-xs leading-relaxed text-muted-foreground">
                  Please ensure that mobile number is linked with Aadhaar as it will be required for
                  OTP authentication. If you do not have a mobile number linked, visit the{' '}
                  <a
                    href="https://uidai.gov.in/en/contact-support/have-any-question/284-faqs/aadhaar-online-services/aadhaar-enrolment.html"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-medium text-primary underline underline-offset-2 hover:text-primary/90"
                  >
                    nearest Aadhaar Enrollment
                  </a>{' '}
                  center and seek assistance.
                </p>
              </Field>

              <div className="space-y-3 rounded-md border border-border/80 bg-muted/20 p-4">
                <p className="text-sm font-semibold text-foreground">I hereby declare that:</p>
                <ConsentCheckboxRow
                  id="abha-consent-all"
                  checked={allConsentsChecked}
                  onCheckedChange={handleSelectAllConsent}
                  label="Select all"
                  labelClassName="text-sm font-medium"
                />
                {CONSENT_ITEMS.map((text, i) => (
                  <ConsentCheckboxRow
                    key={text}
                    id={`abha-consent-${i}`}
                    checked={consentChecked[i] === true}
                    onCheckedChange={(checked) =>
                      setConsentChecked((prev) => ({ ...prev, [i]: checked }))
                    }
                    label={text}
                  />
                ))}

                <ConsentInlineNameRow
                  checkboxId="abha-consent-hw"
                  checked={hwAcknowledged}
                  onCheckedChange={setHwAcknowledged}
                  nameValue={healthcareWorkerName}
                  onNameChange={setHealthcareWorkerName}
                  namePlaceholder="Healthcare worker name"
                  trailingText=", confirm that I have duly informed and explained the beneficiary of the contents of consent for aforementioned purposes."
                />

                <ConsentInlineNameRow
                  checkboxId="abha-consent-ben"
                  checked={beneficiaryAcknowledged}
                  onCheckedChange={setBeneficiaryAcknowledged}
                  nameValue={beneficiaryName}
                  onNameChange={setBeneficiaryName}
                  namePlaceholder="Beneficiary name"
                  trailingText=", have been explained about the consent as stated above and hereby provide my consent for the aforementioned purposes."
                />
              </div>
            </FieldGroup>
          )}

          {step === 'otp' && (
            <FieldGroup className="gap-8">
              <Field className="gap-3">
                <FieldLabel className="text-sm font-semibold text-foreground">
                  Enter the OTP received on {otpMaskedLabel}
                </FieldLabel>
                <InputOTP
                  maxLength={6}
                  value={otp}
                  onChange={(v) => setOtp(digitsOnly(v, 6))}
                  containerClassName="justify-start gap-2"
                >
                  <InputOTPGroup className="gap-2">
                    {Array.from({ length: 6 }).map((_, i) => (
                      <InputOTPSlot
                        key={i}
                        index={i}
                        className="size-11 rounded-md border text-base first:rounded-md last:rounded-md"
                      />
                    ))}
                  </InputOTPGroup>
                </InputOTP>
                <p className="text-xs text-muted-foreground">
                  {resendAttemptsLeft > 0 ? (
                    <>
                      {resendCooldown > 0 ? (
                        <>Resend OTP in {resendCooldown} sec.</>
                      ) : (
                        <button
                          type="button"
                          className="font-medium text-primary underline-offset-4 hover:underline"
                          disabled={!canResendOtp}
                          onClick={() => void handleResendOtp()}
                        >
                          Resend OTP
                        </button>
                      )}
                      {'. '}
                      Attempts remaining: {resendAttemptsLeft}
                    </>
                  ) : (
                    'Maximum resend attempts reached'
                  )}
                </p>
              </Field>

              <Field className="gap-3">
                <FieldLabel className="text-sm font-semibold text-foreground">
                  Enter mobile number to authenticate ABHA Number
                </FieldLabel>
                <div className="flex items-center gap-2">
                  <span className="inline-flex h-11 shrink-0 items-center rounded-md border border-input bg-muted px-3 text-sm tabular-nums">
                    +91
                  </span>
                  <Input
                    id="abha-mobile"
                    inputMode="numeric"
                    autoComplete="off"
                    maxLength={10}
                    value={mobile}
                    onChange={(e) => setMobile(digitsOnly(e.target.value, 10))}
                    placeholder="Enter mobile number"
                    className="h-11 tabular-nums"
                  />
                </div>
                <Alert className="border-sky-200 bg-sky-50 text-sky-950">
                  <InfoIcon className="text-sky-600" />
                  <AlertDescription className="text-xs leading-relaxed text-sky-900/90">
                    It is preferable to use your Aadhaar-linked mobile number. If you choose to use
                    a different mobile number, it will need to be validated again and will be used
                    for all communication related to ABHA.
                  </AlertDescription>
                </Alert>
              </Field>
            </FieldGroup>
          )}

          {step === 'profile' && profileDisplay && (
            <div className="space-y-5">
              <p className="text-sm font-semibold text-foreground">Patient Details</p>

              <div className="space-y-4">
                <div>
                  <p className="text-xs font-medium text-muted-foreground">
                    ABHA Number/ आभा संख्या
                  </p>
                  <p className="mt-1 text-lg font-semibold tabular-nums tracking-tight text-foreground">
                    {profileDisplay.abhaNumber || '—'}
                  </p>
                </div>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-medium text-muted-foreground">
                      ABHA Address/ आभा पता
                    </p>
                    <p className="mt-1 break-all text-lg font-semibold tracking-tight text-foreground">
                      {profileDisplay.abhaAddress || '—'}
                    </p>
                  </div>
                  <Button
                    type="button"
                    size="sm"
                    disabled={isSubmitting}
                    className="shrink-0 gap-1.5 bg-primary text-primary-foreground hover:bg-primary/90"
                    onClick={() => void handleEditAddress()}
                  >
                    <Pencil className="size-3.5" />
                    Edit
                  </Button>
                </div>
              </div>

              <div className="space-y-2.5 rounded-lg bg-sky-50/80 p-4 text-sm">
                <ProfileDetailRow label="Patient Name" value={profileDisplay.patientName} />
                <ProfileDetailRow label="Gender" value={profileDisplay.gender} />
                <ProfileDetailRow label="Date of Birth" value={profileDisplay.dateOfBirth} />
                <ProfileDetailRow label="Mobile Number" value={profileDisplay.mobile} />
                <ProfileDetailRow label="Address" value={profileDisplay.address} />
              </div>
            </div>
          )}

          {step === 'address-edit' && profileDisplay && (
            <div className="space-y-6">
              <div className="space-y-1 text-sm">
                <p className="text-muted-foreground">
                  ABHA Number/ आभा संख्या:{' '}
                  <span className="font-medium text-foreground">{profileDisplay.abhaNumber || '—'}</span>
                </p>
                <p className="text-muted-foreground">
                  ABHA Address/ आभा पता:{' '}
                  <span className="font-medium text-foreground">
                    {profileDisplay.abhaAddress || '—'}
                  </span>
                </p>
              </div>

              {needsMobileVerifyOtp ? (
                <Field className="gap-3 rounded-lg border border-border/80 bg-muted/20 p-4">
                  <FieldLabel className="text-sm font-semibold">
                    Enter OTP sent to mobile ending {mobile.slice(-4)}
                  </FieldLabel>
                  <InputOTP
                    maxLength={6}
                    value={mobileVerifyOtp}
                    onChange={(v) => setMobileVerifyOtp(digitsOnly(v, 6))}
                    containerClassName="justify-start gap-2"
                  >
                    <InputOTPGroup className="gap-2">
                      {Array.from({ length: 6 }).map((_, i) => (
                        <InputOTPSlot key={i} index={i} className="size-10 rounded-md border" />
                      ))}
                    </InputOTPGroup>
                  </InputOTP>
                  <Button
                    type="button"
                    size="sm"
                    disabled={!/^\d{6}$/.test(mobileVerifyOtp) || isSubmitting}
                    className="w-fit bg-primary text-primary-foreground hover:bg-primary/90"
                    onClick={() => void handleMobileVerifyForAddress()}
                  >
                    {isSubmitting ? 'Verifying…' : 'Verify mobile OTP'}
                  </Button>
                </Field>
              ) : (
                <>
                  <div className="space-y-3">
                    <FieldLabel className="text-sm font-semibold text-foreground">
                      Create Patient ABHA Address
                    </FieldLabel>
                    <div className="flex flex-wrap items-center gap-2">
                      <Input
                        value={addressLocal}
                        onChange={(e) => {
                          setAddressLocal(e.target.value.replace(/[^a-zA-Z0-9._]/g, ''));
                          setAddressError(null);
                        }}
                        placeholder="Enter custom Address"
                        className="h-11 min-w-[12rem] flex-1"
                        maxLength={18}
                      />
                      <span className="inline-flex h-11 items-center rounded-md border border-input bg-muted px-3 text-sm text-muted-foreground">
                        {ABHA_ADDRESS_SUFFIX}
                      </span>
                      <Button
                        type="button"
                        disabled={!addressLocalValid || isSubmitting}
                        className="h-11 bg-primary text-primary-foreground hover:bg-primary/90"
                        onClick={() => void handleCreateAddress()}
                      >
                        {isSubmitting ? 'Creating…' : 'Create ABHA Address'}
                      </Button>
                    </div>
                    {addressError ? (
                      <p className="text-xs text-destructive">{addressError}</p>
                    ) : null}
                    <ol className="list-decimal space-y-0.5 pl-4 text-xs text-muted-foreground">
                      <li>Minimum length - 8 characters</li>
                      <li>Maximum length - 18 characters</li>
                      <li>Special characters allowed - 1 dot (.) and/or 1 underscore (_)</li>
                      <li>Dot/underscore must be in between (not at start or end)</li>
                      <li>Only letters and numbers are allowed</li>
                    </ol>
                  </div>

                  {suggestions.length > 0 ? (
                    <div className="space-y-2">
                      <p className="text-sm font-semibold text-foreground">Suggestions:</p>
                      <div className="flex flex-wrap gap-2">
                        {suggestions.map((suggestion) => {
                          const local = stripAbhaSuffix(suggestion);
                          return (
                            <button
                              key={suggestion}
                              type="button"
                              className="rounded-md border border-primary/40 bg-primary/5 px-3 py-1.5 text-xs font-medium text-primary transition-colors hover:bg-primary/10"
                              onClick={() => {
                                setAddressLocal(local);
                                setAddressError(null);
                              }}
                            >
                              {local}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ) : null}
                </>
              )}

              <div className="space-y-2.5 rounded-lg bg-sky-50/80 p-4 text-sm">
                <ProfileDetailRow label="Patient Name" value={profileDisplay.patientName} />
                <ProfileDetailRow label="Gender" value={profileDisplay.gender} />
                <ProfileDetailRow label="Date of Birth" value={profileDisplay.dateOfBirth} />
                <ProfileDetailRow label="Mobile Number" value={profileDisplay.mobile} />
                <ProfileDetailRow label="Address" value={profileDisplay.address} />
              </div>
            </div>
          )}
        </div>

        {showFooter && (
          <>
            <Separator />
            <DialogFooter className="mb-0 shrink-0 flex-row items-center justify-between gap-3 rounded-b-xl border-0 border-t bg-background px-6 pt-4 pb-6 sm:justify-between">
              {showBack ? (
                <Button
                  type="button"
                  variant="outline"
                  disabled={isSubmitting}
                  className="min-w-[6rem]"
                  onClick={handleBack}
                >
                  Go Back
                </Button>
              ) : (
                <span />
              )}

              {step === 'login-soon' && <span />}

              {step === 'consent' && (
                <Button
                  type="button"
                  disabled={!consentStepValid || isSubmitting}
                  className="min-w-[6rem] bg-primary text-primary-foreground hover:bg-primary/90 disabled:bg-primary/40 disabled:text-primary-foreground/90"
                  onClick={() => void handleConsentNext()}
                >
                  {isSubmitting ? 'Sending OTP…' : 'Next'}
                </Button>
              )}

              {step === 'otp' && (
                <Button
                  type="button"
                  disabled={!otpStepValid || isSubmitting}
                  className="min-w-[6rem] bg-primary text-primary-foreground hover:bg-primary/90"
                  onClick={() => void handleOtpNext()}
                >
                  {isSubmitting ? 'Verifying…' : 'Next'}
                </Button>
              )}

              {(step === 'profile' || step === 'address-edit') && (
                <Button
                  type="button"
                  disabled={isSubmitting || (step === 'address-edit' && needsMobileVerifyOtp)}
                  className="min-w-[6rem] bg-primary text-primary-foreground hover:bg-primary/90"
                  onClick={handleDone}
                >
                  {isSubmitting ? 'Saving…' : 'Done'}
                </Button>
              )}
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

function ConsentCheckboxRow({
  id,
  checked,
  onCheckedChange,
  label,
  labelClassName,
}: {
  id: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  label: string;
  labelClassName?: string;
}) {
  return (
    <div className="flex items-start gap-2.5">
      <Checkbox
        id={id}
        checked={checked}
        onCheckedChange={(v) => onCheckedChange(v === true)}
        className="mt-0.5 shrink-0"
      />
      <label
        htmlFor={id}
        className={`min-w-0 flex-1 cursor-pointer text-xs font-normal leading-relaxed text-foreground/90 ${labelClassName ?? ''}`}
      >
        {label}
      </label>
    </div>
  );
}

const inlineNameInputClass =
  'inline-block h-6 w-[10.5rem] max-w-[45%] align-baseline rounded-none border-0 border-b border-input bg-transparent px-1 py-0 text-xs font-normal shadow-none focus-visible:ring-0';

function ConsentInlineNameRow({
  checkboxId,
  checked,
  onCheckedChange,
  nameValue,
  onNameChange,
  namePlaceholder,
  readOnly = false,
  trailingText,
}: {
  checkboxId: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  nameValue: string;
  onNameChange?: (value: string) => void;
  namePlaceholder: string;
  readOnly?: boolean;
  trailingText: string;
}) {
  return (
    <div className="flex items-start gap-2.5">
      <Checkbox
        id={checkboxId}
        checked={checked}
        onCheckedChange={(v) => onCheckedChange(v === true)}
        className="mt-0.5 shrink-0"
      />
      <p className="min-w-0 flex-1 text-xs font-normal leading-relaxed text-foreground/90">
        <label htmlFor={checkboxId} className="cursor-pointer">
          I,&nbsp;
        </label>
        <Input
          value={nameValue}
          readOnly={readOnly}
          placeholder={namePlaceholder}
          onChange={
            readOnly || !onNameChange
              ? undefined
              : (e) => {
                  e.stopPropagation();
                  onNameChange(e.target.value);
                }
          }
          onClick={(e) => e.stopPropagation()}
          onKeyDown={(e) => e.stopPropagation()}
          className={inlineNameInputClass}
          aria-label={namePlaceholder}
        />
        <label htmlFor={checkboxId} className="cursor-pointer">
          {trailingText}
        </label>
      </p>
    </div>
  );
}

function ProfileDetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid grid-cols-[9.5rem_1fr] items-start gap-x-2 gap-y-0.5">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium text-foreground">
        <span className="text-muted-foreground">: </span>
        {value || '—'}
      </span>
    </div>
  );
}
