import type { Dispatch } from 'react';
import { Button } from '@pulse/ui/button';
import { CONTENT_MIN_H } from '../../wizard/constants';
import type { AbhaWizardAction } from '../../wizard/types';

export function AbhaWizardMethodStep({ dispatch }: { dispatch: Dispatch<AbhaWizardAction> }) {
  return (
    <div
      className={`flex ${CONTENT_MIN_H} flex-col items-center justify-center gap-8 py-6 text-center`}
    >
      <p className="max-w-xs text-sm leading-relaxed text-muted-foreground">
        Please choose below option to start with the creation of your ABHA
      </p>
      <Button
        type="button"
        variant="outline"
        className="h-12 min-w-[14rem] rounded-md border-2 border-primary/50 bg-background px-8 text-base font-medium text-primary shadow-none hover:border-primary hover:bg-primary/5"
        onClick={() => {
          dispatch({ type: 'SET_LOGIN_AADHAAR_CONSENT', value: false });
          dispatch({ type: 'SET_STEP', step: 'consent' });
        }}
      >
        Aadhaar Number
      </Button>
      <p className="text-sm text-muted-foreground">
        Already have an ABHA?{' '}
        <button
          type="button"
          className="font-semibold text-primary underline-offset-4 hover:underline"
          onClick={() => dispatch({ type: 'SET_STEP', step: 'login-method' })}
        >
          Login
        </button>
      </p>
    </div>
  );
}
