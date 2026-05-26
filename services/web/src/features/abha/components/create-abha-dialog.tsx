import { Button } from '@pulse/ui/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@pulse/ui/dialog';
import { Separator } from '@pulse/ui/separator';
import { AbhaWizardAddressStep } from './steps/abha-wizard-address-step';
import { AbhaWizardConsentStep } from './steps/abha-wizard-consent-step';
import { AbhaWizardLoginSteps } from './steps/abha-wizard-login-steps';
import { AbhaWizardMethodStep } from './steps/abha-wizard-method-step';
import { AbhaWizardOtpStep } from './steps/abha-wizard-otp-step';
import { AbhaWizardProfileStep } from './steps/abha-wizard-profile-step';
import type { AbhaCreatedPayload } from '@/features/abha/types';
import { CONTENT_MIN_H, DIALOG_SHELL, stepShowsBack } from '../wizard/constants';
import type { AbhaWizardFlow } from '../wizard/types';
import { useAbhaWizard } from '../wizard/use-abha-wizard';
import { useAuthStore } from '@/stores/auth.store';

export interface CreateAbhaDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: (payload: AbhaCreatedPayload) => void;
  /** Opens directly on verify/login method selection when `verify`. */
  flow?: AbhaWizardFlow;
}

export function CreateAbhaDialog({
  open,
  onOpenChange,
  onSuccess,
  flow = 'create',
}: CreateAbhaDialogProps) {
  const authDisplayName = useAuthStore((s) => s.displayName) ?? '';

  const { state, dispatch, derived, handlers } = useAbhaWizard({
    open,
    flow,
    authDisplayName,
    onSuccess,
    onOpenChange,
  });

  const showFooter = state.step !== 'method' && state.step !== 'login-method';
  const showBack = stepShowsBack(state.step, state.flow);

  return (
    <Dialog open={open} onOpenChange={handlers.handleOpenChange}>
      <DialogContent className={DIALOG_SHELL} showCloseButton>
        <DialogHeader className="shrink-0 space-y-0 px-6 pb-4 pt-5">
          <DialogTitle className="text-base font-semibold text-foreground">
            {derived.isVerifyTitle ? 'Verify ABHA' : 'Create ABHA'}
          </DialogTitle>
        </DialogHeader>

        <Separator />

        <div
          className={`min-h-0 flex-1 overflow-y-auto overscroll-y-contain px-6 py-5 ${CONTENT_MIN_H}`}
        >
          {state.step === 'method' && <AbhaWizardMethodStep dispatch={dispatch} />}

          <AbhaWizardLoginSteps
            step={state.step}
            state={state}
            dispatch={dispatch}
            flow={state.flow}
            isSubmitting={state.isSubmitting}
            loginOtpMaskedLabel={derived.loginOtpMaskedLabel}
            loginResendAttemptsLeft={derived.loginResendAttemptsLeft}
            loginResendCooldown={state.login.resendCooldown}
            canResendLoginOtp={derived.canResendLoginOtp}
            onLoginMethodSelect={handlers.handleLoginMethodSelect}
            onLoginChannelSelect={(ch) => void handlers.handleLoginChannelSelect(ch)}
            onLoginAbhaAddressChannelSelect={(ch) =>
              void handlers.handleLoginAbhaAddressChannelSelect(ch)
            }
            onLoginOtpVerify={() => void handlers.handleLoginOtpVerify()}
            onLoginAccountSelect={(n) => void handlers.handleLoginAccountSelect(n)}
            onLoginResendOtp={() => void handlers.handleLoginResendOtp()}
          />

          {state.step === 'consent' && (
            <AbhaWizardConsentStep
              state={state}
              dispatch={dispatch}
              allConsentsChecked={derived.allConsentsChecked}
            />
          )}

          {state.step === 'otp' && (
            <AbhaWizardOtpStep
              state={state}
              dispatch={dispatch}
              otpMaskedLabel={derived.otpMaskedLabel}
              resendAttemptsLeft={derived.resendAttemptsLeft}
              resendCooldown={derived.resendCooldown}
              canResendOtp={derived.canResendOtp}
              onResendOtp={() => void handlers.handleResendOtp()}
            />
          )}

          {state.step === 'profile' && state.profileDisplay && (
            <AbhaWizardProfileStep
              profileDisplay={state.profileDisplay}
              isSubmitting={state.isSubmitting}
              onEditAddress={() => void handlers.handleEditAddress()}
            />
          )}

          {state.step === 'address-edit' && state.profileDisplay && (
            <AbhaWizardAddressStep
              state={state}
              dispatch={dispatch}
              profileDisplay={state.profileDisplay}
              addressLocalValid={derived.addressLocalValid}
              onMobileVerify={() => void handlers.handleMobileVerifyForAddress()}
              onCreateAddress={() => void handlers.handleCreateAddress()}
            />
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
                  disabled={state.isSubmitting}
                  className="min-w-[6rem]"
                  onClick={handlers.handleBack}
                >
                  Go Back
                </Button>
              ) : (
                <span />
              )}

              {state.step === 'login-abha-number' && (
                <Button
                  type="button"
                  disabled={!derived.loginAbhaNumberValid || state.isSubmitting}
                  className="min-w-[6rem] bg-primary text-primary-foreground hover:bg-primary/90"
                  onClick={() => dispatch({ type: 'SET_STEP', step: 'login-abha-channel' })}
                >
                  Next
                </Button>
              )}

              {(state.step === 'login-abha-channel' ||
                state.step === 'login-abha-address-channel' ||
                state.step === 'login-otp' ||
                state.step === 'login-account-select') && <span />}

              {state.step === 'login-abha-address' && (
                <Button
                  type="button"
                  disabled={!derived.loginAbhaAddressValid || state.isSubmitting}
                  className="min-w-[6rem] bg-primary text-primary-foreground hover:bg-primary/90 disabled:bg-primary/40 disabled:text-primary-foreground/90"
                  onClick={handlers.handleLoginAbhaAddressNext}
                >
                  Next
                </Button>
              )}

              {state.step === 'login-mobile' && (
                <Button
                  type="button"
                  disabled={!derived.loginMobileValid || state.isSubmitting}
                  className="min-w-[6rem] bg-primary text-primary-foreground hover:bg-primary/90 disabled:bg-primary/40 disabled:text-primary-foreground/90"
                  onClick={() => void handlers.handleLoginMobileNext()}
                >
                  {state.isSubmitting ? 'Sending OTP…' : 'Next'}
                </Button>
              )}

              {state.step === 'consent' && (
                <Button
                  type="button"
                  disabled={!derived.consentStepValid || state.isSubmitting}
                  className="min-w-[6rem] bg-primary text-primary-foreground hover:bg-primary/90 disabled:bg-primary/40 disabled:text-primary-foreground/90"
                  onClick={() => void handlers.handleConsentNext()}
                >
                  {state.isSubmitting ? 'Sending OTP…' : 'Next'}
                </Button>
              )}

              {state.step === 'otp' && (
                <Button
                  type="button"
                  disabled={!derived.otpStepValid || state.isSubmitting}
                  className="min-w-[6rem] bg-primary text-primary-foreground hover:bg-primary/90"
                  onClick={() => void handlers.handleOtpNext()}
                >
                  {state.isSubmitting ? 'Verifying…' : 'Next'}
                </Button>
              )}

              {(state.step === 'profile' || state.step === 'address-edit') && (
                <Button
                  type="button"
                  disabled={
                    state.isSubmitting ||
                    (state.step === 'address-edit' && state.address.needsMobileVerifyOtp)
                  }
                  className="min-w-[6rem] bg-primary text-primary-foreground hover:bg-primary/90"
                  onClick={() => void handlers.handleDone()}
                >
                  {state.isSubmitting ? 'Saving…' : 'Done'}
                </Button>
              )}
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
