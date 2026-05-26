import type { Dispatch } from 'react';
import { Button } from '@pulse/ui/button';
import { Field, FieldLabel } from '@pulse/ui/field';
import { Input } from '@pulse/ui/input';
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from '@pulse/ui/input-otp';
import { ProfileDetailRow } from '@/features/abha/components/abha-wizard-ui';
import type { AbhaProfileDisplay } from '@/features/abha/types';
import { ABHA_ADDRESS_SUFFIX } from '../../wizard/constants';
import type { AbhaWizardAction, AbhaWizardState } from '../../wizard/types';
import { digitsOnly } from '@/lib/digits-only';

function stripAbhaSuffix(address: string): string {
  const at = address.lastIndexOf('@');
  return at > 0 ? address.slice(0, at) : address;
}

export function AbhaWizardAddressStep({
  state,
  dispatch,
  profileDisplay,
  addressLocalValid,
  onMobileVerify,
  onCreateAddress,
}: {
  state: AbhaWizardState;
  dispatch: Dispatch<AbhaWizardAction>;
  profileDisplay: AbhaProfileDisplay;
  addressLocalValid: boolean;
  onMobileVerify: () => void;
  onCreateAddress: () => void;
}) {
  const { address, otpSession, isSubmitting } = state;

  return (
    <div className="space-y-6">
      <div className="space-y-1 text-sm">
        <p className="text-muted-foreground">
          ABHA Number/ आभा संख्या:{' '}
          <span className="font-medium text-foreground">{profileDisplay.abhaNumber || '—'}</span>
        </p>
        <p className="text-muted-foreground">
          ABHA Address/ आभा पता:{' '}
          <span className="font-medium text-foreground">{profileDisplay.abhaAddress || '—'}</span>
        </p>
      </div>

      {address.needsMobileVerifyOtp ? (
        <Field className="gap-3 rounded-lg border border-border/80 bg-muted/20 p-4">
          <FieldLabel className="text-sm font-semibold">
            Enter OTP sent to mobile ending {otpSession.mobile.slice(-4)}
          </FieldLabel>
          <InputOTP
            maxLength={6}
            value={address.mobileVerifyOtp}
            onChange={(v) =>
              dispatch({ type: 'SET_MOBILE_VERIFY_OTP', otp: digitsOnly(v, 6) })
            }
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
            disabled={!/^\d{6}$/.test(address.mobileVerifyOtp) || isSubmitting}
            className="w-fit bg-primary text-primary-foreground hover:bg-primary/90"
            onClick={onMobileVerify}
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
                value={address.addressLocal}
                onChange={(e) =>
                  dispatch({
                    type: 'SET_ADDRESS_LOCAL',
                    value: e.target.value.replace(/[^a-zA-Z0-9._]/g, ''),
                  })
                }
                placeholder="Enter custom Address"
                className="h-11 min-w-[12rem] flex-1"
                maxLength={18}
                aria-invalid={address.addressError != null}
                aria-describedby={address.addressError ? 'abha-address-error' : undefined}
              />
              <span className="inline-flex h-11 items-center rounded-md border border-input bg-muted px-3 text-sm text-muted-foreground">
                {ABHA_ADDRESS_SUFFIX}
              </span>
              <Button
                type="button"
                disabled={!addressLocalValid || isSubmitting}
                className="h-11 bg-primary text-primary-foreground hover:bg-primary/90"
                onClick={onCreateAddress}
              >
                {isSubmitting ? 'Creating…' : 'Create ABHA Address'}
              </Button>
            </div>
            {address.addressError ? (
              <p id="abha-address-error" className="text-xs text-destructive" role="alert">
                {address.addressError}
              </p>
            ) : null}
            <ol className="list-decimal space-y-0.5 pl-4 text-xs text-muted-foreground">
              <li>Minimum length - 8 characters</li>
              <li>Maximum length - 18 characters</li>
              <li>Special characters allowed - 1 dot (.) and/or 1 underscore (_)</li>
              <li>Dot/underscore must be in between (not at start or end)</li>
              <li>Only letters and numbers are allowed</li>
            </ol>
          </div>

          {address.suggestions.length > 0 ? (
            <div className="space-y-2">
              <p className="text-sm font-semibold text-foreground">Suggestions:</p>
              <div className="flex flex-wrap gap-2">
                {address.suggestions.map((suggestion) => {
                  const local = stripAbhaSuffix(suggestion);
                  return (
                    <button
                      key={suggestion}
                      type="button"
                      className="rounded-md border border-primary/40 bg-primary/5 px-3 py-1.5 text-xs font-medium text-primary transition-colors hover:bg-primary/10"
                      onClick={() => dispatch({ type: 'SET_ADDRESS_LOCAL', value: local })}
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
  );
}
