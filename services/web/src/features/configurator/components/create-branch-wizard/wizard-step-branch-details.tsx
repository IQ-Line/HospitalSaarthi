import type { ComponentProps } from 'react';
import { Controller } from 'react-hook-form';
import type { Control, FieldErrors, UseFormRegister } from 'react-hook-form';
import { Input } from '@pulse/ui/input';
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from '@pulse/ui/field';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@pulse/ui/select';
import type { BranchWizardFormValues } from '@/features/configurator/create-branch-wizard-schema';
import { INDIAN_STATE_OPTIONS } from '@/features/configurator/create-tenant-wizard-schema';

export interface WizardStepBranchDetailsProps {
  register: UseFormRegister<BranchWizardFormValues>;
  control: Control<BranchWizardFormValues>;
  errors: FieldErrors<BranchWizardFormValues>;
  tenantSlugPreview: string;
  parentTenantName: string;
}

export function WizardStepBranchDetails({
  register,
  control,
  errors,
  tenantSlugPreview,
  parentTenantName,
}: WizardStepBranchDetailsProps) {
  return (
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
          <FieldLabel htmlFor="br-wiz-code">
            Branch code <span className="text-destructive">*</span>
          </FieldLabel>
          <FieldContent>
            <Input
              id="br-wiz-code"
              className="h-9 font-mono text-sm uppercase"
              placeholder="MUM-01"
              {...register('branchCode')}
            />
            <FieldDescription>Uppercase alphanumeric + hyphen, 2–10 characters.</FieldDescription>
            <FieldError errors={errors.branchCode ? [errors.branchCode] : undefined} />
          </FieldContent>
        </Field>
        <Field>
          <FieldLabel htmlFor="br-wiz-slug-preview">Slug (auto)</FieldLabel>
          <FieldContent>
            <Input
              id="br-wiz-slug-preview"
              className="h-9 font-mono text-sm"
              readOnly
              disabled
              value={tenantSlugPreview}
            />
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
        <Field>
          <FieldLabel htmlFor="br-wiz-locality">Locality</FieldLabel>
          <FieldContent>
            <Input id="br-wiz-locality" className="h-9 text-sm" {...register('locality')} />
          </FieldContent>
        </Field>
        <Field>
          <FieldLabel htmlFor="br-wiz-block">Block</FieldLabel>
          <FieldContent>
            <Input id="br-wiz-block" className="h-9 text-sm" {...register('block')} />
          </FieldContent>
        </Field>
        <Field>
          <FieldLabel htmlFor="br-wiz-district">
            District <span className="text-destructive">*</span>
          </FieldLabel>
          <FieldContent>
            <Input id="br-wiz-district" className="h-9 text-sm" {...register('district')} />
            <FieldError errors={errors.district ? [errors.district] : undefined} />
          </FieldContent>
        </Field>
        <Field>
          <FieldLabel id="br-wiz-state-label">
            State <span className="text-destructive">*</span>
          </FieldLabel>
          <FieldContent>
            <Controller
              name="state"
              control={control}
              render={({ field }) => (
                <Select value={field.value || undefined} onValueChange={field.onChange}>
                  <SelectTrigger className="h-9 w-full text-sm" aria-labelledby="br-wiz-state-label">
                    <SelectValue placeholder="Select state" />
                  </SelectTrigger>
                  <SelectContent>
                    {INDIAN_STATE_OPTIONS.map((s) => (
                      <SelectItem key={s.value} value={s.value}>
                        {s.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            <FieldError errors={errors.state ? [errors.state] : undefined} />
          </FieldContent>
        </Field>
        <Field>
          <FieldLabel htmlFor="br-wiz-pin">
            PIN code <span className="text-destructive">*</span>
          </FieldLabel>
          <FieldContent>
            <Input id="br-wiz-pin" className="h-9 text-sm" maxLength={6} {...register('pinCode')} />
            <FieldError errors={errors.pinCode ? [errors.pinCode] : undefined} />
          </FieldContent>
        </Field>
      </div>
    </FieldGroup>
  );
}
