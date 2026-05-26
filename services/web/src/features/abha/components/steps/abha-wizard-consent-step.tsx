import type { Dispatch } from 'react';
import { Field, FieldGroup, FieldLabel } from '@pulse/ui/field';
import { AadhaarSegmentInput } from '@/features/abha/components/aadhaar-segment-input';
import {
  ConsentCheckboxRow,
  ConsentInlineNameRow,
} from '@/features/abha/components/abha-wizard-ui';
import { CONSENT_ITEMS } from '../../wizard/constants';
import type { AbhaWizardAction, AbhaWizardState } from '../../wizard/types';

export function AbhaWizardConsentStep({
  state,
  dispatch,
  allConsentsChecked,
}: {
  state: AbhaWizardState;
  dispatch: Dispatch<AbhaWizardAction>;
  allConsentsChecked: boolean;
}) {
  const { aadhaar, consent } = state;

  return (
    <FieldGroup className="gap-5">
      <Field className="gap-2.5">
        <FieldLabel className="text-sm font-semibold text-foreground">
          Enter Patient Aadhaar Number
        </FieldLabel>
        <AadhaarSegmentInput
          seg1={aadhaar.seg1}
          seg2={aadhaar.seg2}
          seg3={aadhaar.seg3}
          maskSeg1={aadhaar.maskSeg1}
          maskSeg2={aadhaar.maskSeg2}
          onSeg1Change={(v) => dispatch({ type: 'SET_AADHAAR_SEG', index: 1, value: v })}
          onSeg2Change={(v) => dispatch({ type: 'SET_AADHAAR_SEG', index: 2, value: v })}
          onSeg3Change={(v) => dispatch({ type: 'SET_AADHAAR_SEG', index: 3, value: v })}
          onMaskSeg1={(masked) => dispatch({ type: 'SET_MASK_SEG', index: 1, masked })}
          onMaskSeg2={(masked) => dispatch({ type: 'SET_MASK_SEG', index: 2, masked })}
        />
        <p className="text-xs leading-relaxed text-muted-foreground">
          Please ensure that mobile number is linked with Aadhaar as it will be required for OTP
          authentication. If you do not have a mobile number linked, visit the{' '}
          <a
            href="https://uidai.gov.in/en/contact-support/have-any-question/284-faqs/aadhaar-online-services/aadhaar-enrolment.html"
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium text-primary underline underline-offset-2 hover:text-primary/90"
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
          onCheckedChange={(checked) => dispatch({ type: 'SELECT_ALL_CONSENT', checked })}
          label="Select all"
          labelClassName="text-sm font-medium"
        />
        {CONSENT_ITEMS.map((text, i) => (
          <ConsentCheckboxRow
            key={text}
            id={`abha-consent-${i}`}
            checked={consent.checked[i] === true}
            onCheckedChange={(checked) =>
              dispatch({ type: 'SET_CONSENT_ITEM', index: i, checked })
            }
            label={text}
          />
        ))}

        <ConsentInlineNameRow
          checkboxId="abha-consent-hw"
          checked={consent.hwAcknowledged}
          onCheckedChange={(acknowledged) => dispatch({ type: 'SET_HW_ACK', acknowledged })}
          nameValue={consent.healthcareWorkerName}
          onNameChange={(name) => dispatch({ type: 'SET_HEALTHCARE_WORKER_NAME', name })}
          namePlaceholder="Healthcare worker name"
          trailingText=", confirm that I have duly informed and explained the beneficiary of the contents of consent for aforementioned purposes."
        />

        <ConsentInlineNameRow
          checkboxId="abha-consent-ben"
          checked={consent.beneficiaryAcknowledged}
          onCheckedChange={(acknowledged) =>
            dispatch({ type: 'SET_BENEFICIARY_ACK', acknowledged })
          }
          nameValue={consent.beneficiaryName}
          onNameChange={(name) => dispatch({ type: 'SET_BENEFICIARY_NAME', name })}
          namePlaceholder="Beneficiary name"
          trailingText=", have been explained about the consent as stated above and hereby provide my consent for the aforementioned purposes."
        />
      </div>
    </FieldGroup>
  );
}
