import { Controller, useWatch } from 'react-hook-form';
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
import {
  NEW_ORGANISATION_VALUE,
  type WizardFormValues,
} from '@/features/configurator/create-tenant-wizard-schema';
import { organizationTypeOptions } from '@/features/configurator/validation';
import type { Organization } from '@/features/configurator/types';

export interface WizardStep0OrganisationProps {
  register: UseFormRegister<WizardFormValues>;
  control: Control<WizardFormValues>;
  errors: FieldErrors<WizardFormValues>;
  organisations: Organization[];
  organisationsLoading: boolean;
  organisationSlugInputProps: React.ComponentProps<'input'>;
  onOrganisationSelectionChange: (selectionId: string) => void;
}

export function WizardStep0Organisation({
  register,
  control,
  errors,
  organisations,
  organisationsLoading,
  organisationSlugInputProps,
  onOrganisationSelectionChange,
}: WizardStep0OrganisationProps) {
  const organisationSelectionId = useWatch({ control, name: 'organisationSelectionId' });
  const isExistingOrgSelection =
    !!organisationSelectionId && organisationSelectionId !== NEW_ORGANISATION_VALUE;

  return (
    <FieldGroup className="@container/field-group mx-auto max-w-none gap-4">
      <div className="grid grid-cols-1 gap-x-6 gap-y-4 md:grid-cols-2">
        <Field className="md:col-span-2">
          <FieldLabel id="wiz-org-name-label">
            Organisation <span className="text-destructive">*</span>
          </FieldLabel>
          <FieldContent>
            <Controller
              name="organisationSelectionId"
              control={control}
              render={({ field }) => (
                <Select
                  value={field.value || undefined}
                  onValueChange={(value) => {
                    field.onChange(value);
                    onOrganisationSelectionChange(value);
                  }}
                >
                  <SelectTrigger
                    className="h-9 w-full min-w-0 text-sm"
                    aria-labelledby="wiz-org-name-label"
                  >
                    <SelectValue
                      placeholder={
                        organisationsLoading ? 'Loading organisations…' : 'Select organisation'
                      }
                      className="truncate"
                    />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NEW_ORGANISATION_VALUE}>Create new organisation</SelectItem>
                    {organisations.map((org) => (
                      <SelectItem key={org.id} value={org.id}>
                        {org.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            <FieldDescription>
              Pick the current organisation, another existing one, or create a new organisation.
            </FieldDescription>
            <FieldError
              errors={
                errors.organisationSelectionId ? [errors.organisationSelectionId] : undefined
              }
            />
          </FieldContent>
        </Field>

        <Controller
          name="organisationSelectionId"
          control={control}
          render={({ field }) =>
            field.value === NEW_ORGANISATION_VALUE ? (
              <Field className="md:col-span-2">
                <FieldLabel htmlFor="wiz-org-new-name">
                  Organisation name <span className="text-destructive">*</span>
                </FieldLabel>
                <FieldContent>
                  <Input
                    id="wiz-org-new-name"
                    className="h-9 text-sm"
                    placeholder="e.g., City Diagnostics Group"
                    {...register('organisationName')}
                  />
                  <FieldError
                    errors={errors.organisationName ? [errors.organisationName] : undefined}
                  />
                </FieldContent>
              </Field>
            ) : null
          }
        />

        <Field>
          <FieldLabel htmlFor="wiz-org-slug">
            Slug <span className="text-destructive">*</span>
          </FieldLabel>
          <FieldContent>
            <Input
              id="wiz-org-slug"
              className="h-9 font-mono text-sm"
              placeholder="e.g., city-diagnostics"
              readOnly={isExistingOrgSelection}
              disabled={isExistingOrgSelection}
              {...organisationSlugInputProps}
            />
            <FieldDescription>Minimum 3 characters; used as the organisation subdomain.</FieldDescription>
            <FieldError errors={errors.organisationSlug ? [errors.organisationSlug] : undefined} />
          </FieldContent>
        </Field>

        <Field>
          <FieldLabel id="wiz-org-type-label">
            Organisation type <span className="text-destructive">*</span>
          </FieldLabel>
          <FieldContent>
            <Controller
              name="organisationType"
              control={control}
              render={({ field }) =>
                isExistingOrgSelection ? (
                  <Input
                    className="h-9 text-sm"
                    readOnly
                    disabled
                    value={
                      organizationTypeOptions.find((o) => o.value === field.value)?.label ??
                      field.value
                    }
                  />
                ) : (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger
                      className="h-9 w-full min-w-0 text-sm"
                      aria-labelledby="wiz-org-type-label"
                    >
                      <SelectValue placeholder="Select type" className="truncate" />
                    </SelectTrigger>
                    <SelectContent>
                      {organizationTypeOptions.map((o) => (
                        <SelectItem key={o.value} value={o.value}>
                          {o.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )
              }
            />
            <FieldError errors={errors.organisationType ? [errors.organisationType] : undefined} />
          </FieldContent>
        </Field>

        <Field>
          <FieldLabel htmlFor="wiz-org-email">Email (optional)</FieldLabel>
          <FieldContent>
            <Input
              id="wiz-org-email"
              className="h-9 text-sm"
              type="email"
              autoComplete="email"
              placeholder="contact@hospital.example"
              {...register('organisationEmail')}
            />
            <FieldError
              errors={errors.organisationEmail ? [errors.organisationEmail] : undefined}
            />
          </FieldContent>
        </Field>

        <Field>
          <FieldLabel htmlFor="wiz-org-website">Website (optional)</FieldLabel>
          <FieldContent>
            <Input
              id="wiz-org-website"
              className="h-9 text-sm"
              placeholder="https://example.com"
              {...register('organisationWebsite')}
            />
            <FieldError
              errors={errors.organisationWebsite ? [errors.organisationWebsite] : undefined}
            />
          </FieldContent>
        </Field>
      </div>
    </FieldGroup>
  );
}
