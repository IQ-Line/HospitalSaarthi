import type { Control, FieldErrors, UseFormRegister, UseFormSetValue, UseFormWatch } from 'react-hook-form';
import { Input } from '@pulse/ui/input';
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from '@pulse/ui/field';
import type { BranchWizardFormValues } from '@/features/configurator/create-branch-wizard-schema';
import { ConfiguratorAddressPincodeFields } from '@/features/configurator/components/configurator-address-pincode-fields';

export interface WizardStepBranchDetailsProps {
  register: UseFormRegister<BranchWizardFormValues>;
  control: Control<BranchWizardFormValues>;
  errors: FieldErrors<BranchWizardFormValues>;
  setValue: UseFormSetValue<BranchWizardFormValues>;
  watch: UseFormWatch<BranchWizardFormValues>;
  suggestedSlug: string;
  parentTenantName: string;
}

export function WizardStepBranchDetails({
  register,
  control,
  errors,
  setValue,
  watch,
  suggestedSlug,
  parentTenantName,
}: WizardStepBranchDetailsProps) {  return (
    <FieldGroup className="@container/field-group mx-auto max-w-none gap-4">
      <Field className="rounded-md border border-dashed bg-muted/30 px-3 py-2">
        <FieldDescription className="text-xs">
          Parent tenant: <span className="font-medium text-foreground">{parentTenantName}</span>
        </FieldDescription>
      </Field>
      <div className="grid grid-cols-1 gap-x-6 gap-y-4 md:grid-cols-2">
        <Field className="md:col-span-2">
          <FieldLabel htmlFor="br-wiz-name">
            Branch name <span className="text-destructive">*</span>
          </FieldLabel>
          <FieldContent>
            <Input
              id="br-wiz-name"
              className="h-9 text-sm"
              placeholder="e.g., Main Laboratory"
              {...register('branchName')}
            />
            <FieldError errors={errors.branchName ? [errors.branchName] : undefined} />
          </FieldContent>
        </Field>
        <Field>
          <FieldLabel htmlFor="br-wiz-code">Branch code (optional)</FieldLabel>
          <FieldContent>
            <Input
              id="br-wiz-code"
              className="h-9 font-mono text-sm uppercase"
              placeholder="MUM-01"
              {...register('branchCode')}
            />
            <FieldDescription>Uppercase letters, digits, hyphens, and underscores; 2–10 characters.</FieldDescription>
            <FieldError errors={errors.branchCode ? [errors.branchCode] : undefined} />
          </FieldContent>
        </Field>
        <Field>
          <FieldLabel htmlFor="br-wiz-slug">Tenant slug (optional)</FieldLabel>
          <FieldContent>
            <Input
              id="br-wiz-slug"
              className="h-9 font-mono text-sm"
              placeholder={suggestedSlug || 'e.g., org-slug-branch-name'}
              {...register('branchSlug')}
            />
            <FieldDescription>
              Leave blank to auto-generate from branch name
              {suggestedSlug ? ` (suggested: ${suggestedSlug})` : ''}.
            </FieldDescription>
            <FieldError errors={errors.branchSlug ? [errors.branchSlug] : undefined} />
          </FieldContent>
        </Field>
        <Field className="md:col-span-2">
          <FieldLabel htmlFor="br-wiz-hq">
            Address <span className="text-destructive">*</span>
          </FieldLabel>
          <FieldContent>
            <Input
              id="br-wiz-hq"
              className="h-9 text-sm"
              placeholder="Street address"
              {...register('hqAddressLine1')}
            />
            <FieldError errors={errors.hqAddressLine1 ? [errors.hqAddressLine1] : undefined} />
          </FieldContent>
        </Field>
        <ConfiguratorAddressPincodeFields
          idPrefix="br-wiz"
          errors={errors}
          setValue={setValue}
          watch={watch}
        />
      </div>    </FieldGroup>
  );
}
