import type { ComponentProps } from 'react';
import type { Control, FieldErrors, UseFormRegister, UseFormSetValue, UseFormWatch } from 'react-hook-form';
import { Input } from '@pulse/ui/input';
import {
  Field,
  FieldContent,
  FieldError,
  FieldGroup,
  FieldLabel,
} from '@pulse/ui/field';
import type { WizardFormValues } from '@/features/configurator/create-tenant-wizard-schema';
import { ConfiguratorAddressPincodeFields } from '@/features/configurator/components/configurator-address-pincode-fields';
import { LogoUploadField } from '@/features/configurator/components/logo-upload-field';

export interface WizardStep1OrgFieldsProps {
  register: UseFormRegister<WizardFormValues>;
  control: Control<WizardFormValues>;
  errors: FieldErrors<WizardFormValues>;
  setValue: UseFormSetValue<WizardFormValues>;
  watch: UseFormWatch<WizardFormValues>;
  tenantSlugInputProps: ComponentProps<'input'>;
  tenantLogoFile: File | null;
  onTenantLogoFileChange: (file: File | null) => void;
}

export function WizardStep1OrgFields({
  register,
  control,
  errors,
  setValue,
  watch,
  tenantSlugInputProps,
  tenantLogoFile,
  onTenantLogoFileChange,
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
            <p
              data-slot="field-description"
              className="text-muted-foreground text-sm leading-normal font-normal"
            >
              Fills with the first letter or digit from the tenant name; edit freely (minimum 3
              characters).
            </p>
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
        <ConfiguratorAddressPincodeFields
          idPrefix="wiz"
          register={register}
          control={control}
          errors={errors}
          setValue={setValue}
          watch={watch}
        />

        <LogoUploadField
          id="wiz-tenant-logo"
          label="Tenant logo (optional)"
          description="Upload a PNG or JPEG logo for this tenant. Stored in Azure Blob Storage."
          file={tenantLogoFile}
          onFileChange={onTenantLogoFileChange}
        />
      </div>
    </FieldGroup>
  );
}
