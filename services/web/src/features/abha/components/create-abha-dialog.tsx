import { useCallback, useEffect, useMemo, useState, type ChangeEvent } from 'react';
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
import { Input } from '@pulse/ui/input';
import { Label } from '@pulse/ui/label';
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
  /** Prefill mobile on OTP step from registration form phone. */
  defaultMobile?: string;
}

function digitsOnly(value: string, maxLen: number): string {
  return value.replace(/\D/g, '').slice(0, maxLen);
}

function maskSegment(value: string): string {
  if (!value) return '';
  return '•'.repeat(value.length);
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
    if (!open) {
      resetWizard();
    }
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
    hwAcknowledged &&
    beneficiaryAcknowledged &&
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

  const startResendCooldown = () => {
    setResendCooldown(RESEND_COOLDOWN_SEC);
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
      const display = mapAbhaProfileDisplay(profileRes.profile, verifyRes);
      const prefill = mapAbhaProfileToFormPrefill(profileRes.profile, verifyRes);
      setProfileDisplay(display);
      setFormPrefill(prefill);
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
    switch (step) {
      case 'login-soon':
        setStep('method');
        break;
      case 'consent':
        setStep('method');
        break;
      case 'otp':
        setStep('consent');
        break;
      case 'profile':
        setStep('otp');
        break;
      default:
        break;
    }
  };

  const showBack =
    step === 'login-soon' || step === 'consent' || step === 'otp' || step === 'profile';

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="flex max-h-[min(90dvh,720px)] w-full max-w-[calc(100%-2rem)] flex-col gap-0 overflow-hidden p-0 sm:max-w-lg">
        <DialogHeader className="shrink-0 border-b border-border px-6 py-4">
          <DialogTitle>Create ABHA</DialogTitle>
        </DialogHeader>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-y-contain px-6 py-5">
          {step === 'method' && (
            <div className="flex flex-col items-center gap-6 py-8 text-center">
              <p className="max-w-sm text-sm text-muted-foreground">
                Please choose below option to start with the creation of your ABHA
              </p>
              <Button
                type="button"
                variant="outline"
                className="h-11 min-w-[12rem] border-primary text-primary hover:bg-primary/5"
                onClick={() => setStep('consent')}
              >
                Aadhaar Number
              </Button>
              <p className="text-sm text-muted-foreground">
                Already have an ABHA?{' '}
                <button
                  type="button"
                  className="font-medium text-primary underline-offset-4 hover:underline"
                  onClick={() => setStep('login-soon')}
                >
                  Login
                </button>
              </p>
            </div>
          )}

          {step === 'login-soon' && (
            <div className="flex flex-col items-center gap-4 py-12 text-center">
              <p className="text-sm text-muted-foreground">
                Login to an existing ABHA will be added soon.
              </p>
            </div>
          )}

          {step === 'consent' && (
            <div className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="abha-aadhaar-seg1">Enter Patient Aadhaar Number</Label>
                <div className="flex items-center gap-2">
                  <Input
                    id="abha-aadhaar-seg1"
                    inputMode="numeric"
                    autoComplete="off"
                    maxLength={4}
                    value={maskSeg1 ? maskSegment(aadhaarSeg1) : aadhaarSeg1}
                    onChange={(e: ChangeEvent<HTMLInputElement>) => {
                      setMaskSeg1(false);
                      setAadhaarSeg1(digitsOnly(e.target.value, 4));
                    }}
                    onBlur={() => setMaskSeg1(aadhaarSeg1.length > 0)}
                    className="text-center tabular-nums"
                    placeholder="••••"
                  />
                  <span className="text-muted-foreground">-</span>
                  <Input
                    inputMode="numeric"
                    autoComplete="off"
                    maxLength={4}
                    value={maskSeg2 ? maskSegment(aadhaarSeg2) : aadhaarSeg2}
                    onChange={(e: ChangeEvent<HTMLInputElement>) => {
                      setMaskSeg2(false);
                      setAadhaarSeg2(digitsOnly(e.target.value, 4));
                    }}
                    onBlur={() => setMaskSeg2(aadhaarSeg2.length > 0)}
                    className="text-center tabular-nums"
                    placeholder="••••"
                  />
                  <span className="text-muted-foreground">-</span>
                  <Input
                    inputMode="numeric"
                    autoComplete="off"
                    maxLength={4}
                    value={aadhaarSeg3}
                    onChange={(e: ChangeEvent<HTMLInputElement>) => {
                      setAadhaarSeg3(digitsOnly(e.target.value, 4));
                    }}
                    className="text-center tabular-nums"
                    placeholder="••••"
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  Please ensure that mobile number is linked with Aadhaar as it will be required for
                  OTP authentication. If you do not have a mobile number linked, visit the nearest
                  Aadhaar Enrollment center and seek assistance.
                </p>
              </div>

              <div className="space-y-3 rounded-md border border-border p-4">
                <p className="text-sm font-medium">I hereby declare that:</p>
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="abha-consent-all"
                    checked={allConsentsChecked}
                    onCheckedChange={(v) => handleSelectAllConsent(v === true)}
                  />
                  <Label htmlFor="abha-consent-all" className="cursor-pointer font-normal">
                    Select all
                  </Label>
                </div>
                {CONSENT_ITEMS.map((text, i) => (
                  <div key={text} className="flex items-start gap-2">
                    <Checkbox
                      id={`abha-consent-${i}`}
                      checked={consentChecked[i] === true}
                      onCheckedChange={(v) =>
                        setConsentChecked((prev) => ({ ...prev, [i]: v === true }))
                      }
                      className="mt-0.5"
                    />
                    <Label htmlFor={`abha-consent-${i}`} className="cursor-pointer text-xs font-normal leading-snug">
                      {text}
                    </Label>
                  </div>
                ))}

                <div className="space-y-2 border-t border-border pt-3">
                  <div className="flex items-start gap-2">
                    <Checkbox
                      id="abha-consent-hw"
                      checked={hwAcknowledged}
                      onCheckedChange={(v) => setHwAcknowledged(v === true)}
                      className="mt-0.5"
                    />
                    <Label htmlFor="abha-consent-hw" className="cursor-pointer text-xs font-normal leading-snug">
                      I, <span className="font-medium">{healthcareWorkerName || '—'}</span>, confirm
                      that I have duly informed and explained the beneficiary of the contents of
                      consent for aforementioned purposes.
                    </Label>
                  </div>
                  <div className="flex items-start gap-2">
                    <Checkbox
                      id="abha-consent-ben"
                      checked={beneficiaryAcknowledged}
                      onCheckedChange={(v) => setBeneficiaryAcknowledged(v === true)}
                      className="mt-0.5"
                    />
                    <div className="flex-1 space-y-1">
                      <Label htmlFor="abha-beneficiary-name" className="sr-only">
                        Beneficiary name
                      </Label>
                      <p className="text-xs leading-snug">
                        I,{' '}
                        <Input
                          id="abha-beneficiary-name"
                          value={beneficiaryName}
                          onChange={(e) => setBeneficiaryName(e.target.value)}
                          placeholder="Beneficiary name"
                          className="mx-1 inline-flex h-7 w-40 align-middle text-xs"
                        />
                        , have been explained about the consent as stated above and hereby provide
                        my consent for the aforementioned purposes.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {step === 'otp' && (
            <div className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="abha-otp">Enter OTP</Label>
                <Input
                  id="abha-otp"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  maxLength={6}
                  value={otp}
                  onChange={(e) => setOtp(digitsOnly(e.target.value, 6))}
                  placeholder="6-digit OTP"
                  className="tabular-nums"
                />
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">
                    OTP sent to Aadhaar-linked mobile
                  </span>
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
              </div>

              <div className="space-y-2">
                <Label htmlFor="abha-mobile">Enter mobile number</Label>
                <Input
                  id="abha-mobile"
                  inputMode="numeric"
                  autoComplete="tel-national"
                  maxLength={10}
                  value={mobile}
                  onChange={(e) => setMobile(digitsOnly(e.target.value, 10))}
                  placeholder="10-digit mobile"
                  className="tabular-nums"
                />
                <p className="text-xs text-muted-foreground">
                  Primary mobile for ABHA — use the number linked with Aadhaar or where you received
                  the OTP.
                </p>
              </div>
            </div>
          )}

          {step === 'profile' && profileDisplay && (
            <div className="space-y-4">
              <p className="text-sm font-medium">Patient Details</p>

              <div className="space-y-2 text-sm">
                <div>
                  <span className="text-muted-foreground">ABHA Number/ आभा संख्या</span>
                  <p className="font-medium tabular-nums">{profileDisplay.abhaNumber || '—'}</p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <div className="min-w-0 flex-1">
                    <span className="text-muted-foreground">ABHA Address/ आभा पता</span>
                    <p className="break-all font-medium">{profileDisplay.abhaAddress || '—'}</p>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled
                    title="Coming soon"
                    className="shrink-0 gap-1"
                  >
                    <Pencil className="size-3.5" />
                    Edit
                  </Button>
                </div>
              </div>

              <div className="space-y-2 rounded-md bg-muted/50 p-4 text-sm">
                <ProfileRow label="Patient Name" value={profileDisplay.patientName} />
                <ProfileRow label="Gender" value={profileDisplay.gender} />
                <ProfileRow label="Date of Birth" value={profileDisplay.dateOfBirth} />
                <ProfileRow label="Mobile Number" value={profileDisplay.mobile} />
                <ProfileRow label="Address" value={profileDisplay.address} />
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="shrink-0 gap-2 border-t border-border px-6 py-4 sm:justify-between">
          {showBack ? (
            <Button type="button" variant="outline" disabled={isSubmitting} onClick={handleBack}>
              Go Back
            </Button>
          ) : (
            <span />
          )}

          {step === 'consent' && (
            <Button
              type="button"
              disabled={!consentStepValid || isSubmitting}
              onClick={() => void handleConsentNext()}
            >
              {isSubmitting ? 'Sending OTP…' : 'Next'}
            </Button>
          )}

          {step === 'otp' && (
            <Button
              type="button"
              disabled={!otpStepValid || isSubmitting}
              onClick={() => void handleOtpNext()}
            >
              {isSubmitting ? 'Verifying…' : 'Next'}
            </Button>
          )}

          {step === 'profile' && (
            <Button type="button" onClick={handleDone}>
              Done
            </Button>
          )}

          {(step === 'method' || step === 'login-soon') && <span />}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ProfileRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid grid-cols-[8rem_1fr] gap-2">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium">{value || '—'}</span>
    </div>
  );
}
