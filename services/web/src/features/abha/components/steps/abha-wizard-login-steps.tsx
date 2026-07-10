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
import {
  ABHA_ADDRESS_LOCAL_RULES,
  fullAbhaAddressFromLocal,
} from '@/features/abha/utils/abha-address-validation';
import { ABHA_ADDRESS_SUFFIX, CONTENT_MIN_H, LOGIN_METHODS } from '../../wizard/constants';
import type { AbhaWizardAction, AbhaWizardState, WizardStep } from '../../wizard/types';
import { digitsOnly } from '@/lib/digits-only';

type LoginState = AbhaWizardState['login'];

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

function LoginMethodStep({
  flow,
  dispatch,
  onLoginMethodSelect,
}: {
  flow: AbhaWizardState['flow'];
  dispatch: Dispatch<AbhaWizardAction>;
  onLoginMethodSelect: (methodId: string) => void;
}) {
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

function LoginAbhaNumberStep({
  login,
  dispatch,
}: {
  login: LoginState;
  dispatch: Dispatch<AbhaWizardAction>;
}) {
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
        {login.abhaNumberError ? (
          <p className="text-sm text-destructive">{login.abhaNumberError}</p>
        ) : null}
      </Field>
    </FieldGroup>
  );
}

function LoginAbhaChannelStep({
  login,
  isSubmitting,
  onLoginChannelSelect,
}: {
  login: LoginState;
  isSubmitting: boolean;
  onLoginChannelSelect: (channel: 'aadhaar' | 'abha-otp') => void;
}) {
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

function LoginAbhaAddressStep({
  login,
  dispatch,
}: {
  login: LoginState;
  dispatch: Dispatch<AbhaWizardAction>;
}) {
  return (
    <div className="space-y-6">
      <Field className="gap-3">
        <FieldLabel className="text-sm font-semibold text-foreground">
          Enter Patient ABHA Address
        </FieldLabel>
        <div className="flex max-w-md flex-wrap items-center gap-2">
          <Input
            autoComplete="off"
            placeholder="Enter ABHA Address"
            value={login.abhaAddress}
            onChange={(e) =>
              dispatch({
                type: 'SET_LOGIN_ABHA_ADDRESS',
                value: e.target.value.replace(/[^a-zA-Z0-9._]/g, ''),
              })
            }
            className="h-11 min-w-[12rem] flex-1 text-base"
            maxLength={18}
            aria-invalid={login.abhaAddressError != null}
            aria-describedby={login.abhaAddressError ? 'login-abha-address-error' : undefined}
          />
          <span className="inline-flex h-11 shrink-0 items-center rounded-md border border-input bg-muted px-3 text-sm text-muted-foreground">
            {ABHA_ADDRESS_SUFFIX}
          </span>
        </div>
        {login.abhaAddressError ? (
          <p id="login-abha-address-error" className="text-xs text-destructive" role="alert">
            {login.abhaAddressError}
          </p>
        ) : null}
      </Field>
      <ol className="list-disc space-y-1 pl-5 text-sm text-muted-foreground">
        {ABHA_ADDRESS_LOCAL_RULES.map((rule) => (
          <li key={rule}>{rule}</li>
        ))}
      </ol>
    </div>
  );
}

function LoginAbhaAddressChannelStep({
  login,
  isSubmitting,
  onLoginAbhaAddressChannelSelect,
}: {
  login: LoginState;
  isSubmitting: boolean;
  onLoginAbhaAddressChannelSelect: (channel: 'mobile' | 'aadhaar') => void;
}) {
  return (
    <FieldGroup className="gap-6">
      <Field>
        <FieldLabel className="text-sm font-semibold text-foreground">
          Enter Patient ABHA Address
        </FieldLabel>
          <p className="text-lg font-medium text-foreground">
            {fullAbhaAddressFromLocal(login.abhaAddress, ABHA_ADDRESS_SUFFIX)}
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

function LoginMobileStep({
  login,
  dispatch,
}: {
  login: LoginState;
  dispatch: Dispatch<AbhaWizardAction>;
}) {
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

function LoginAccountSelectStep({
  login,
  isSubmitting,
  onLoginAccountSelect,
}: {
  login: LoginState;
  isSubmitting: boolean;
  onLoginAccountSelect: (abhaNumber: string) => void;
}) {
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

function LoginOtpStep({
  login,
  dispatch,
  isSubmitting,
  loginOtpMaskedLabel,
  loginResendAttemptsLeft,
  loginResendCooldown,
  canResendLoginOtp,
  onLoginOtpVerify,
  onLoginResendOtp,
}: {
  login: LoginState;
  dispatch: Dispatch<AbhaWizardAction>;
  isSubmitting: boolean;
  loginOtpMaskedLabel: string;
  loginResendAttemptsLeft: number;
  loginResendCooldown: number;
  canResendLoginOtp: boolean;
  onLoginOtpVerify: () => void;
  onLoginResendOtp: () => void;
}) {
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
      <p className="flex flex-wrap items-center justify-center gap-1 text-center text-xs text-muted-foreground">
        {loginResendAttemptsLeft > 0 ? (
          <>
            <Button
              type="button"
              variant="link"
              className="h-auto p-0 text-xs font-semibold text-primary underline-offset-4 hover:text-primary/90"
              disabled={loginResendCooldown > 0 || !canResendLoginOtp}
              onClick={onLoginResendOtp}
            >
              {loginResendCooldown > 0
                ? `Resend OTP in ${loginResendCooldown} sec`
                : 'Resend OTP'}
            </Button>
            <span>· Attempts remaining: {loginResendAttemptsLeft}</span>
          </>
        ) : (
          'Maximum resend attempts reached'
        )}
      </p>
    </div>
  );
}

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
      <LoginMethodStep
        flow={flow}
        dispatch={dispatch}
        onLoginMethodSelect={onLoginMethodSelect}
      />
    );
  }

  if (step === 'login-abha-number') {
    return <LoginAbhaNumberStep login={login} dispatch={dispatch} />;
  }

  if (step === 'login-abha-channel') {
    return (
      <LoginAbhaChannelStep
        login={login}
        isSubmitting={isSubmitting}
        onLoginChannelSelect={onLoginChannelSelect}
      />
    );
  }

  if (step === 'login-abha-address') {
    return <LoginAbhaAddressStep login={login} dispatch={dispatch} />;
  }

  if (step === 'login-abha-address-channel') {
    return (
      <LoginAbhaAddressChannelStep
        login={login}
        isSubmitting={isSubmitting}
        onLoginAbhaAddressChannelSelect={onLoginAbhaAddressChannelSelect}
      />
    );
  }

  if (step === 'login-mobile') {
    return <LoginMobileStep login={login} dispatch={dispatch} />;
  }

  if (step === 'login-account-select') {
    return (
      <LoginAccountSelectStep
        login={login}
        isSubmitting={isSubmitting}
        onLoginAccountSelect={onLoginAccountSelect}
      />
    );
  }

  if (step === 'login-otp') {
    return (
      <LoginOtpStep
        login={login}
        dispatch={dispatch}
        isSubmitting={isSubmitting}
        loginOtpMaskedLabel={loginOtpMaskedLabel}
        loginResendAttemptsLeft={loginResendAttemptsLeft}
        loginResendCooldown={loginResendCooldown}
        canResendLoginOtp={canResendLoginOtp}
        onLoginOtpVerify={onLoginOtpVerify}
        onLoginResendOtp={onLoginResendOtp}
      />
    );
  }

  return null;
}
