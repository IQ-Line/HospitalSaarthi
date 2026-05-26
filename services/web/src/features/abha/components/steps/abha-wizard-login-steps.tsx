import type { Dispatch } from 'react';
import { Phone, Smartphone } from 'lucide-react';
import { Button } from '@pulse/ui/button';
import { Field, FieldGroup, FieldLabel } from '@pulse/ui/field';
import { Input } from '@pulse/ui/input';
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from '@pulse/ui/input-otp';
import {
  AbhaNumberSegmentInput,
  formatAbhaNumberDisplay,
} from '@/features/abha/components/abha-number-segment-input';
import { CONTENT_MIN_H, LOGIN_METHODS } from '../../wizard/constants';
import type { AbhaWizardAction, AbhaWizardState, WizardStep } from '../../wizard/types';
import { digitsOnly } from '@/lib/digits-only';

const LOGIN_STEPS = new Set<WizardStep>([
  'login-method',
  'login-abha-number',
  'login-abha-channel',
  'login-abha-address',
  'login-abha-address-channel',
  'login-mobile',
  'login-otp',
  'login-account-select',
]);

export function AbhaWizardLoginSteps({
  step,
  state,
  dispatch,
  flow,
  isSubmitting,
  loginOtpMaskedLabel,
  loginResendAttemptsLeft,
  loginResendCooldown,
  canResendLoginOtp,
  onLoginMethodSelect,
  onLoginChannelSelect,
  onLoginAbhaAddressChannelSelect,
  onLoginOtpVerify,
  onLoginAccountSelect,
  onLoginResendOtp,
}: {
  step: WizardStep;
  state: AbhaWizardState;
  dispatch: Dispatch<AbhaWizardAction>;
  flow: AbhaWizardState['flow'];
  isSubmitting: boolean;
  loginOtpMaskedLabel: string;
  loginResendAttemptsLeft: number;
  loginResendCooldown: number;
  canResendLoginOtp: boolean;
  onLoginMethodSelect: (methodId: string) => void;
  onLoginChannelSelect: (channel: 'aadhaar' | 'abha-otp') => void;
  onLoginAbhaAddressChannelSelect: (channel: 'mobile' | 'aadhaar') => void;
  onLoginOtpVerify: () => void;
  onLoginAccountSelect: (abhaNumber: string) => void;
  onLoginResendOtp: () => void;
}) {
  if (!LOGIN_STEPS.has(step)) return null;
  const { login } = state;

  if (step === 'login-method') {
    return (
      <div
        className={`flex ${CONTENT_MIN_H} flex-col items-center justify-center gap-8 py-6 text-center`}
      >
        <p className="max-w-md text-sm leading-relaxed text-muted-foreground">
          Please choose one of the below options to verify your ABHA
        </p>
        <div className="flex w-full max-w-xs flex-col gap-3">
          {LOGIN_METHODS.map((method) => (
            <Button
              key={method.id}
              type="button"
              variant="outline"
              className="h-12 rounded-md border-2 border-primary/50 bg-primary/5 px-8 text-base font-medium text-primary shadow-none hover:border-primary hover:bg-primary/10"
              onClick={() => onLoginMethodSelect(method.id)}
            >
              {method.label}
            </Button>
          ))}
        </div>
        {flow === 'create' ? (
          <p className="text-sm text-muted-foreground">
            Don&apos;t have an ABHA?{' '}
            <button
              type="button"
              className="font-semibold text-primary underline-offset-4 hover:underline"
              onClick={() => dispatch({ type: 'SET_STEP', step: 'method' })}
            >
              Create here
            </button>
          </p>
        ) : null}
      </div>
    );
  }

  if (step === 'login-abha-number') {
    return (
      <FieldGroup className="gap-4">
        <Field>
          <FieldLabel className="text-sm font-semibold text-foreground">
            Enter Patient ABHA Number
          </FieldLabel>
          <AbhaNumberSegmentInput
            segments={login.abhaSegments}
            onChange={(segments) => dispatch({ type: 'SET_LOGIN_ABHA_SEGMENTS', segments })}
          />
        </Field>
      </FieldGroup>
    );
  }

  if (step === 'login-abha-channel') {
    return (
      <FieldGroup className="gap-6">
        <Field>
          <FieldLabel className="text-sm font-semibold text-foreground">
            Enter Patient ABHA Number
          </FieldLabel>
          <p className="text-lg font-medium tabular-nums tracking-wide text-foreground">
            {formatAbhaNumberDisplay(login.abhaSegments)}
          </p>
        </Field>
        <Field className="gap-3">
          <FieldLabel className="text-sm font-semibold text-foreground">
            Please select option for Verification
          </FieldLabel>
          <div className="flex flex-wrap gap-3">
            <Button
              type="button"
              variant="outline"
              disabled={isSubmitting}
              className="h-11 gap-2 border-border px-5"
              onClick={() => onLoginChannelSelect('aadhaar')}
            >
              <Smartphone className="size-4" />
              Aadhaar OTP
            </Button>
            <Button
              type="button"
              variant="outline"
              disabled={isSubmitting}
              className="h-11 gap-2 border-border px-5"
              onClick={() => onLoginChannelSelect('abha-otp')}
            >
              <Phone className="size-4" />
              Mobile OTP
            </Button>
          </div>
        </Field>
      </FieldGroup>
    );
  }

  if (step === 'login-abha-address') {
    return (
      <FieldGroup className="gap-4">
        <Field>
          <FieldLabel className="text-sm font-semibold text-foreground">
            Enter Patient ABHA Address
          </FieldLabel>
          <Input
            autoComplete="off"
            placeholder="username@sbx"
            value={login.abhaAddress}
            onChange={(e) =>
              dispatch({ type: 'SET_LOGIN_ABHA_ADDRESS', value: e.target.value.trimStart() })
            }
            className="max-w-md text-lg"
            aria-invalid={login.abhaAddressError != null}
          />
          {login.abhaAddressError ? (
            <p className="text-xs text-destructive" role="alert">
              {login.abhaAddressError}
            </p>
          ) : null}
        </Field>
      </FieldGroup>
    );
  }

  if (step === 'login-abha-address-channel') {
    return (
      <FieldGroup className="gap-6">
        <Field>
          <FieldLabel className="text-sm font-semibold text-foreground">
            Enter Patient ABHA Address
          </FieldLabel>
          <p className="text-lg font-medium text-foreground">{login.abhaAddress.trim()}</p>
        </Field>
        <Field className="gap-3">
          <FieldLabel className="text-sm font-semibold text-foreground">
            Please select option for Verification
          </FieldLabel>
          <div className="flex flex-wrap gap-3">
            <Button
              type="button"
              variant="outline"
              disabled={isSubmitting}
              className="h-11 gap-2 border-border px-5"
              onClick={() => onLoginAbhaAddressChannelSelect('aadhaar')}
            >
              <Smartphone className="size-4" />
              Aadhaar OTP
            </Button>
            <Button
              type="button"
              variant="outline"
              disabled={isSubmitting}
              className="h-11 gap-2 border-border px-5"
              onClick={() => onLoginAbhaAddressChannelSelect('mobile')}
            >
              <Phone className="size-4" />
              Mobile OTP
            </Button>
          </div>
        </Field>
      </FieldGroup>
    );
  }

  if (step === 'login-mobile') {
    return (
      <FieldGroup className="gap-4">
        <Field>
          <FieldLabel className="text-sm font-semibold text-foreground">
            Enter Patient Mobile Number
          </FieldLabel>
          <Input
            inputMode="numeric"
            autoComplete="tel"
            placeholder="10-digit mobile number"
            maxLength={10}
            value={login.mobile}
            onChange={(e) =>
              dispatch({ type: 'SET_LOGIN_MOBILE', mobile: digitsOnly(e.target.value, 10) })
            }
            className="max-w-md text-lg tabular-nums tracking-wide"
          />
        </Field>
      </FieldGroup>
    );
  }

  if (step === 'login-account-select') {
    return (
      <div className="flex flex-col gap-4 py-2">
        <p className="text-sm text-muted-foreground">
          Multiple ABHA accounts are linked to this mobile number. Select one to continue.
        </p>
        <div className="flex flex-col gap-3">
          {login.accounts.map((account) => (
            <Button
              key={account.abhaNumber}
              type="button"
              variant="outline"
              disabled={isSubmitting}
              className="h-auto flex-col items-start gap-1 px-4 py-3 text-left"
              onClick={() => onLoginAccountSelect(account.abhaNumber)}
            >
              <span className="text-sm font-semibold text-foreground">
                {account.name?.trim() || 'ABHA account'}
              </span>
              <span className="text-xs tabular-nums text-muted-foreground">
                {account.abhaNumber}
              </span>
              {account.preferredAbhaAddress ? (
                <span className="text-xs text-muted-foreground">
                  {account.preferredAbhaAddress}
                </span>
              ) : null}
            </Button>
          ))}
        </div>
      </div>
    );
  }

  if (step === 'login-otp') {
    return (
      <div className="flex flex-col items-center gap-6 py-4">
        <p className="text-center text-sm font-semibold text-foreground">
          Enter the OTP received on {loginOtpMaskedLabel}
        </p>
        <div className="flex flex-wrap items-center justify-center gap-3">
          <InputOTP
            maxLength={6}
            value={login.otp}
            onChange={(v) => dispatch({ type: 'SET_LOGIN_OTP', otp: digitsOnly(v, 6) })}
            containerClassName="justify-center gap-2"
          >
            <InputOTPGroup className="gap-2">
              {Array.from({ length: 6 }).map((_, i) => (
                <InputOTPSlot key={i} index={i} className="size-11 rounded-md border text-base" />
              ))}
            </InputOTPGroup>
          </InputOTP>
          <Button
            type="button"
            size="sm"
            disabled={!/^\d{6}$/.test(login.otp) || isSubmitting}
            className="h-11 bg-primary px-5 text-primary-foreground hover:bg-primary/90"
            onClick={onLoginOtpVerify}
          >
            {isSubmitting ? 'Verifying…' : 'Verify'}
          </Button>
        </div>
        <p className="text-center text-xs text-muted-foreground">
          {loginResendAttemptsLeft > 0 ? (
            <>
              {loginResendCooldown > 0 ? (
                <>Resend OTP in {loginResendCooldown} sec.</>
              ) : (
                <button
                  type="button"
                  className="font-medium text-primary underline-offset-4 hover:underline"
                  disabled={!canResendLoginOtp}
                  onClick={onLoginResendOtp}
                >
                  Resend OTP
                </button>
              )}
              {'. '}
              Attempts remaining: {loginResendAttemptsLeft}
            </>
          ) : (
            'Maximum resend attempts reached'
          )}
        </p>
      </div>
    );
  }

  return null;
}
