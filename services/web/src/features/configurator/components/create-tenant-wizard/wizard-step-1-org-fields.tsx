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
import { INDIAN_STATE_OPTIONS, type WizardFormValues } from '@/features/configurator/create-tenant-wizard-schema';

export interface WizardStep1OrgFieldsProps {
  register: UseFormRegister<WizardFormValues>;
  control: Control<WizardFormValues>;
  errors: FieldErrors<WizardFormValues>;
  tenantSlugInputProps: ComponentProps<'input'>;
}

export function WizardStep1OrgFields({
  register,
  control,
  errors,
  tenantSlugInputProps,
}: WizardStep1OrgFieldsProps) {
  return (
    <FieldGroup className="@container/field-group mx-auto max-w-none gap-4">
      <div className="grid grid-cols-1 gap-x-6 gap-y-4 md:grid-cols-2">
        <Field className="md:col-span-2">
          <FieldLabel htmlFor="wiz-tenant-name">
            Tenant name <span className="text-destructive">*</span>
          </FieldLabel>
          <FieldContent>
            <Input
              id="wiz-tenant-name"
              className="h-9 text-sm"
              placeholder="e.g., City Diagnostics"
              {...register('tenantName')}
            />
            <FieldError errors={errors.tenantName ? [errors.tenantName] : undefined} />
          </FieldContent>
        </Field>
        <Field>
          <FieldLabel htmlFor="wiz-slug">
            Slug (subdomain) <span className="text-destructive">*</span>
          </FieldLabel>
          <FieldContent>
            <Input
              id="wiz-slug"
              className="h-9 font-mono text-sm"
              placeholder="e.g., city-diagnostics"
              {...tenantSlugInputProps}
            />
            <FieldDescription>
              Fills with the first letter or digit from the tenant name; edit freely (minimum 3
              characters).
            </FieldDescription>
            <FieldError errors={errors.tenantSlug ? [errors.tenantSlug] : undefined} />
          </FieldContent>
        </Field>
        <Field>
          <FieldLabel htmlFor="wiz-gstin">GSTIN (optional)</FieldLabel>
          <FieldContent>
            <Input
              id="wiz-gstin"
              className="h-9 text-sm"
              placeholder="15-character GSTIN"
              {...register('gstin')}
            />
          </FieldContent>
        </Field>
        <Field>
          <FieldLabel htmlFor="wiz-pan">PAN number (optional)</FieldLabel>
          <FieldContent>
            <Input id="wiz-pan" className="h-9 text-sm" placeholder="ABCDE1234F" {...register('pan')} />
          </FieldContent>
        </Field>
        <Field className="md:col-span-2">
          <FieldLabel htmlFor="wiz-hq">
            Address <span className="text-destructive">*</span>
          </FieldLabel>
          <FieldContent>
            <Input
              id="wiz-hq"
              className="h-9 text-sm"
              placeholder="Street address"
              {...register('hqAddressLine1')}
            />
          </FieldContent>
        </Field>
        <Field>
          <FieldLabel htmlFor="wiz-locality">Locality</FieldLabel>
          <FieldContent>
            <Input id="wiz-locality" className="h-9 text-sm" placeholder="Locality" {...register('locality')} />
          </FieldContent>
        </Field>
        <Field>
          <FieldLabel htmlFor="wiz-block">Block</FieldLabel>
          <FieldContent>
            <Input id="wiz-block" className="h-9 text-sm" placeholder="Block" {...register('block')} />
          </FieldContent>
        </Field>
        <Field>
          <FieldLabel htmlFor="wiz-district">
            District <span className="text-destructive">*</span>
          </FieldLabel>
          <FieldContent>
            <Input id="wiz-district" className="h-9 text-sm" placeholder="District" {...register('district')} />
          </FieldContent>
        </Field>
        <Field>
          <FieldLabel id="wiz-state-label">
            State <span className="text-destructive">*</span>
          </FieldLabel>
          <FieldContent>
            <Controller
              name="state"
              control={control}
              render={({ field }) => (
                <Select value={field.value || undefined} onValueChange={field.onChange}>
                  <SelectTrigger
                    className="h-9 w-full min-w-0 text-sm"
                    aria-labelledby="wiz-state-label"
                  >
                    <SelectValue placeholder="Select state" className="truncate" />
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
          </FieldContent>
        </Field>
        <Field>
          <FieldLabel htmlFor="wiz-pin">
            PIN code <span className="text-destructive">*</span>
          </FieldLabel>
          <FieldContent>
            <Input
              id="wiz-pin"
              className="h-9 text-sm"
              placeholder="123456"
              maxLength={6}
              {...register('pinCode')}
            />
          </FieldContent>
        </Field>
      </div>
    </FieldGroup>
  );
}
