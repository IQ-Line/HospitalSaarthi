import type { Dispatch } from 'react';
import { InfoIcon } from 'lucide-react';
import { Alert, AlertDescription } from '@pulse/ui/alert';
import { Button } from '@pulse/ui/button';
import { Field, FieldGroup, FieldLabel } from '@pulse/ui/field';
import { Input } from '@pulse/ui/input';
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from '@pulse/ui/input-otp';
import { ConsentCheckboxRow } from '@/features/abha/components/abha-wizard-ui';
import type { AbhaWizardAction, AbhaWizardState } from '../../wizard/types';
import { formatMaskedMobileLast4 } from '@/features/abha/utils/abha-address-validation';
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
  const linkedLast4 = otpSession.otpMobileLast4.replace(/\D/g, '').slice(-4);
  const linkedHint =
    linkedLast4.length === 4 ? formatMaskedMobileLast4(linkedLast4) : null;

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
        <p className="flex flex-wrap items-center gap-1 text-xs text-muted-foreground">
          {resendAttemptsLeft > 0 ? (
            <>
              <Button
                type="button"
                variant="link"
                className="h-auto p-0 text-xs font-semibold text-primary underline-offset-4 hover:text-primary/90"
                disabled={resendCooldown > 0 || !canResendOtp}
                onClick={() => void onResendOtp()}
              >
                {resendCooldown > 0 ? `Resend OTP in ${resendCooldown} sec` : 'Resend OTP'}
              </Button>
              <span>· Attempts remaining: {resendAttemptsLeft}</span>
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
        <div className="flex flex-wrap items-center gap-2">
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
            className="h-11 min-w-[12rem] flex-1 tabular-nums"
          />
        </div>
        <ConsentCheckboxRow
          id="abha-aadhaar-linked-mobile"
          checked={otpSession.aadhaarLinkedMobile}
          onCheckedChange={(value) =>
            dispatch({ type: 'SET_AADHAAR_LINKED_MOBILE', value })
          }
          label={
            linkedHint
              ? `This mobile number is linked to Aadhaar (OTP was sent to ${linkedHint})`
              : 'This mobile number is linked to my Aadhaar (same number that received the Aadhaar OTP)'
          }
        />
        {!otpSession.aadhaarLinkedMobile ? (
          <p className="text-xs text-muted-foreground">
            A separate OTP will be sent to verify this mobile before ABHA address setup.
          </p>
        ) : null}
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
