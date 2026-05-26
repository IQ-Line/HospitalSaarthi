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
import { AbhaWizardLoginSoonStep } from './steps/abha-wizard-login-soon-step';
import { AbhaWizardMethodStep } from './steps/abha-wizard-method-step';
import { AbhaWizardOtpStep } from './steps/abha-wizard-otp-step';
import { AbhaWizardProfileStep } from './steps/abha-wizard-profile-step';
import type { AbhaCreatedPayload } from '@/features/abha/types';
import { WIZARD_STEP_CONFIG } from '../wizard/constants';
import { useAbhaWizard } from '../wizard/use-abha-wizard';
import { useAuthStore } from '@/stores/auth.store';

export interface CreateAbhaDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: (payload: AbhaCreatedPayload) => void;
}

export function CreateAbhaDialog({ open, onOpenChange, onSuccess }: CreateAbhaDialogProps) {
  const authDisplayName = useAuthStore((s) => s.displayName) ?? '';

  const { state, dispatch, derived, handlers } = useAbhaWizard({
    open,
    authDisplayName,
    onSuccess,
    onOpenChange,
  });

  const stepUi = WIZARD_STEP_CONFIG[state.step]!;

  return (
    <Dialog open={open} onOpenChange={handlers.handleOpenChange}>
      <DialogContent
        className={`flex max-h-[min(92dvh,780px)] w-full max-w-[calc(100%-2rem)] flex-col gap-0 overflow-hidden p-0 ${
          stepUi.wide ? 'sm:max-w-5xl' : 'sm:max-w-lg'
        }`}
        showCloseButton
      >
        <DialogHeader className="shrink-0 space-y-0 px-6 pb-4 pt-5">
          <DialogTitle className="text-base font-semibold text-foreground">Create ABHA</DialogTitle>
        </DialogHeader>

        <Separator />

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-y-contain px-6 py-5">
          {state.step === 'method' && <AbhaWizardMethodStep dispatch={dispatch} />}

          {state.step === 'login-soon' && <AbhaWizardLoginSoonStep />}

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
              onResendOtp={handlers.handleResendOtp}
            />
          )}

          {state.step === 'profile' && state.profileDisplay && (
            <AbhaWizardProfileStep
              profileDisplay={state.profileDisplay}
              isSubmitting={state.isSubmitting}
              onEditAddress={handlers.handleEditAddress}
            />
          )}

          {state.step === 'address-edit' && state.profileDisplay && (
            <AbhaWizardAddressStep
              state={state}
              dispatch={dispatch}
              profileDisplay={state.profileDisplay}
              addressLocalValid={derived.addressLocalValid}
              onMobileVerify={handlers.handleMobileVerifyForAddress}
              onCreateAddress={handlers.handleCreateAddress}
            />
          )}
        </div>

        {stepUi.showFooter && (
          <>
            <Separator />
            <DialogFooter className="mb-0 shrink-0 flex-row items-center justify-between gap-3 rounded-b-xl border-0 border-t bg-background px-6 pt-4 pb-6 sm:justify-between">
              {stepUi.showBack ? (
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

              {state.step === 'login-soon' && <span />}

              {state.step === 'consent' && (
                <Button
                  type="button"
                  disabled={!derived.consentStepValid || state.isSubmitting}
                  className="min-w-[6rem] bg-primary text-primary-foreground hover:bg-primary/90 disabled:bg-primary/40 disabled:text-primary-foreground/90"
                  onClick={handlers.handleConsentNext}
                >
                  {state.isSubmitting ? 'Sending OTP…' : 'Next'}
                </Button>
              )}

              {state.step === 'otp' && (
                <Button
                  type="button"
                  disabled={!derived.otpStepValid || state.isSubmitting}
                  className="min-w-[6rem] bg-primary text-primary-foreground hover:bg-primary/90"
                  onClick={handlers.handleOtpNext}
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
                  onClick={handlers.handleDone}
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
