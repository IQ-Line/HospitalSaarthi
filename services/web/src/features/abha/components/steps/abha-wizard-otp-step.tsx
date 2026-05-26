import type { Dispatch } from 'react';
import { InfoIcon } from 'lucide-react';
import { Alert, AlertDescription } from '@pulse/ui/alert';
import { Field, FieldGroup, FieldLabel } from '@pulse/ui/field';
import { Input } from '@pulse/ui/input';
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from '@pulse/ui/input-otp';
import type { AbhaWizardAction, AbhaWizardState } from '../../wizard/types';
import { digitsOnly } from '@/lib/digits-only';

export function AbhaWizardOtpStep({
  state,
  dispatch,
  otpMaskedLabel,
  resendAttemptsLeft,
  resendCooldown,
  canResendOtp,
  onResendOtp,
}: {
  state: AbhaWizardState;
  dispatch: Dispatch<AbhaWizardAction>;
  otpMaskedLabel: string;
  resendAttemptsLeft: number;
  resendCooldown: number;
  canResendOtp: boolean;
  onResendOtp: () => void;
}) {
  const { otpSession } = state;

  return (
    <FieldGroup className="gap-8">
      <Field className="gap-3">
        <FieldLabel className="text-sm font-semibold text-foreground">
          Enter the OTP received on {otpMaskedLabel}
        </FieldLabel>
        <InputOTP
          maxLength={6}
          value={otpSession.otp}
          onChange={(v) => dispatch({ type: 'SET_OTP', otp: digitsOnly(v, 6) })}
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
                  onClick={onResendOtp}
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
            value={otpSession.mobile}
            onChange={(e) =>
              dispatch({ type: 'SET_MOBILE', mobile: digitsOnly(e.target.value, 10) })
            }
            placeholder="Enter mobile number"
            className="h-11 tabular-nums"
          />
        </div>
        <Alert className="border-sky-200 bg-sky-50 text-sky-950">
          <InfoIcon className="text-sky-600" />
          <AlertDescription className="text-xs leading-relaxed text-sky-900/90">
            It is preferable to use your Aadhaar-linked mobile number. If you choose to use a
            different mobile number, it will need to be validated again and will be used for all
            communication related to ABHA.
          </AlertDescription>
        </Alert>
      </Field>
    </FieldGroup>
  );
}
