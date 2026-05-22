import { useCallback, useEffect, useMemo, useState } from 'react';
import { Pencil } from 'lucide-react';
import { toast } from 'sonner';
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
  FieldDescription,
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
  getAbhaProfile,
  resendAadhaarOtp,
  sendAadhaarOtp,
  verifyAadhaarOtp,
} from '@/features/abha/api/m1-enrolment';
import type { AbhaCreatedPayload, AbhaProfileDisplay } from '@/features/abha/types';
import {
  mapAbhaProfileDisplay,
  mapAbhaProfileToFormPrefill,
} from '@/features/abha/utils/map-abha-profile';
import { mutationErrorMessage } from '@/lib/mutation-error';
import { useAuthStore } from '@/stores/auth.store';

type WizardStep = 'method' | 'login-soon' | 'consent' | 'otp' | 'profile';

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
const RESEND_COOLDOWN_SEC = 30;

export interface CreateAbhaDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: (payload: AbhaCreatedPayload) => void;
  defaultMobile?: string;
}

function digitsOnly(value: string, maxLen: number): string {
  return value.replace(/\D/g, '').slice(0, maxLen);
}

function initialConsentState(): Record<number, boolean> {
  return Object.fromEntries(CONSENT_ITEMS.map((_, i) => [i, false]));
}

export function CreateAbhaDialog({
  open,
  onOpenChange,
  onSuccess,
  defaultMobile = '',
}: CreateAbhaDialogProps) {
  const healthcareWorkerName = useAuthStore((s) => s.displayName) ?? '';

  const [step, setStep] = useState<WizardStep>('method');
  const [aadhaarSeg1, setAadhaarSeg1] = useState('');
  const [aadhaarSeg2, setAadhaarSeg2] = useState('');
  const [aadhaarSeg3, setAadhaarSeg3] = useState('');
  const [maskSeg1, setMaskSeg1] = useState(false);
  const [maskSeg2, setMaskSeg2] = useState(false);
  const [consentChecked, setConsentChecked] = useState<Record<number, boolean>>(initialConsentState);
  const [hwAcknowledged, setHwAcknowledged] = useState(false);
  const [beneficiaryAcknowledged, setBeneficiaryAcknowledged] = useState(false);
  const [beneficiaryName, setBeneficiaryName] = useState('');
  const [sessionId, setSessionId] = useState('');
  const [aadhaarNumber, setAadhaarNumber] = useState('');
  const [otp, setOtp] = useState('');
  const [mobile, setMobile] = useState('');
  const [otpSendCount, setOtpSendCount] = useState(0);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [profileDisplay, setProfileDisplay] = useState<AbhaProfileDisplay | null>(null);
  const [formPrefill, setFormPrefill] = useState<AbhaCreatedPayload | null>(null);

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
    setBeneficiaryName('');
    setSessionId('');
    setAadhaarNumber('');
    setOtp('');
    setMobile('');
    setOtpSendCount(0);
    setResendCooldown(0);
    setIsSubmitting(false);
    setProfileDisplay(null);
    setFormPrefill(null);
  }, []);

  useEffect(() => {
    if (!open) resetWizard();
  }, [open, resetWizard]);

  useEffect(() => {
    if (step === 'otp' && defaultMobile && !mobile) {
      setMobile(digitsOnly(defaultMobile, 10));
    }
  }, [step, defaultMobile, mobile]);

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
  const canResendOtp = resendCooldown === 0 && otpSendCount < MAX_OTP_SENDS && !isSubmitting;

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
      toast.success(res.message || 'OTP sent to Aadhaar-linked mobile');
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
      toast.success(res.message || 'OTP resent');
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
      toast.success(verifyRes.message || 'Aadhaar verified');
      const profileRes = await getAbhaProfile(sessionId);
      setProfileDisplay(mapAbhaProfileDisplay(profileRes.profile, verifyRes));
      setFormPrefill(mapAbhaProfileToFormPrefill(profileRes.profile, verifyRes));
      setStep('profile');
    } catch (err) {
      toast.error(mutationErrorMessage(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDone = () => {
    if (!formPrefill) return;
    onSuccess(formPrefill);
    onOpenChange(false);
  };

  const handleBack = () => {
    if (isSubmitting) return;
    if (step === 'login-soon' || step === 'consent') setStep('method');
    else if (step === 'otp') setStep('consent');
    else if (step === 'profile') setStep('otp');
  };

  const showFooter = step !== 'method';
  const showBack = step !== 'method';

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        className={`flex max-h-[min(92dvh,780px)] w-full max-w-[calc(100%-2rem)] flex-col gap-0 overflow-hidden p-0 ${
          step === 'consent' || step === 'otp' ? 'sm:max-w-2xl' : 'sm:max-w-lg'
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
                <p className="text-xs leading-relaxed text-primary">
                  Please ensure that mobile number is linked with Aadhaar as it will be required for
                  OTP authentication. If you do not have a mobile number linked, visit the{' '}
                  <a
                    href="https://uidai.gov.in/en/contact-support/have-any-question/284-faqs/aadhaar-online-services/aadhaar-enrolment.html"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-medium underline underline-offset-2"
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
                  namePlaceholder="Healthcare worker name"
                  readOnly
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
            <FieldGroup className="gap-6">
              <Field>
                <FieldLabel className="text-sm font-medium">Enter OTP</FieldLabel>
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
                <div className="flex items-center justify-between pt-1 text-xs">
                  <span className="text-muted-foreground">OTP sent to Aadhaar-linked mobile</span>
                  {otpSendCount < MAX_OTP_SENDS ? (
                    <button
                      type="button"
                      className={
                        canResendOtp
                          ? 'font-medium text-primary underline-offset-4 hover:underline'
                          : 'cursor-not-allowed text-muted-foreground'
                      }
                      disabled={!canResendOtp}
                      onClick={() => void handleResendOtp()}
                    >
                      {resendCooldown > 0
                        ? `Resend OTP in ${resendCooldown}s`
                        : `Resend OTP (${MAX_OTP_SENDS - otpSendCount} left)`}
                    </button>
                  ) : (
                    <span className="text-muted-foreground">Maximum resend attempts reached</span>
                  )}
                </div>
              </Field>

              <Field>
                <FieldLabel className="text-sm font-medium">Enter mobile number</FieldLabel>
                <div className="flex items-center gap-2">
                  <span className="inline-flex h-11 shrink-0 items-center rounded-md border border-input bg-muted px-3 text-sm tabular-nums">
                    +91
                  </span>
                  <Input
                    id="abha-mobile"
                    inputMode="numeric"
                    autoComplete="tel-national"
                    maxLength={10}
                    value={mobile}
                    onChange={(e) => setMobile(digitsOnly(e.target.value, 10))}
                    placeholder="10-digit mobile"
                    className="h-11 tabular-nums"
                  />
                </div>
                <FieldDescription className="text-xs">
                  Primary mobile for ABHA — use the number linked with Aadhaar or where you received
                  the OTP.
                </FieldDescription>
              </Field>
            </FieldGroup>
          )}

          {step === 'profile' && profileDisplay && (
            <div className="space-y-5">
              <p className="text-sm font-semibold text-foreground">Patient Details</p>

              <div className="space-y-3 text-sm">
                <div>
                  <p className="text-muted-foreground">ABHA Number/ आभा संख्या</p>
                  <p className="mt-0.5 text-base font-semibold tabular-nums text-foreground">
                    {profileDisplay.abhaNumber || '—'}
                  </p>
                </div>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="text-muted-foreground">ABHA Address/ आभा पता</p>
                    <p className="mt-0.5 break-all text-base font-semibold text-foreground">
                      {profileDisplay.abhaAddress || '—'}
                    </p>
                  </div>
                  <Button
                    type="button"
                    size="sm"
                    disabled
                    title="Coming soon"
                    className="shrink-0 gap-1.5 bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-60"
                  >
                    <Pencil className="size-3.5" />
                    Edit
                  </Button>
                </div>
              </div>

              <div className="space-y-2.5 rounded-lg bg-muted/60 p-4 text-sm">
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
            <DialogFooter className="shrink-0 flex-row items-center justify-between gap-3 border-0 bg-background px-6 py-4 sm:justify-between">
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

              {step === 'profile' && (
                <Button
                  type="button"
                  className="min-w-[6rem] bg-primary text-primary-foreground hover:bg-primary/90"
                  onClick={handleDone}
                >
                  Done
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
