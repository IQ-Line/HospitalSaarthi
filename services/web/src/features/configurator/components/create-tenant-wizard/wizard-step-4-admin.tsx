import type { UseFormRegister } from 'react-hook-form';
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from '@pulse/ui/field';
import { Input } from '@pulse/ui/input';
import type { WizardFormValues } from '@/features/configurator/create-tenant-wizard-schema';

export interface WizardStep4AdminProps {
  register: UseFormRegister<WizardFormValues>;
}

export function WizardStep4Admin({ register }: WizardStep4AdminProps) {
  return (
    <FieldGroup className="mx-auto max-w-none gap-4">
      <Field>
        <FieldDescription>
          Creates the tenant administrator account (email + password). The user is assigned the role
          and permissions configured in the previous step.
        </FieldDescription>
      </Field>
      <div className="grid grid-cols-1 gap-x-6 gap-y-4 md:grid-cols-2">
        <Field>
          <FieldLabel htmlFor="wiz-afn">
            Admin first name <span className="text-destructive">*</span>
          </FieldLabel>
          <FieldContent>
            <Input id="wiz-afn" className="h-9 text-sm" placeholder="First name" {...register('adminFirstName')} />
          </FieldContent>
        </Field>
        <Field>
          <FieldLabel htmlFor="wiz-aln">
            Admin last name <span className="text-destructive">*</span>
          </FieldLabel>
          <FieldContent>
            <Input id="wiz-aln" className="h-9 text-sm" placeholder="Last name" {...register('adminLastName')} />
          </FieldContent>
        </Field>
      </div>
      <Field>
        <FieldLabel htmlFor="wiz-aemail">
          Email (Gmail or work) <span className="text-destructive">*</span>
        </FieldLabel>
        <FieldContent>
          <Input
            id="wiz-aemail"
            className="h-9 text-sm"
            type="email"
            autoComplete="email"
            placeholder="admin@hospital.example"
            {...register('adminEmail')}
          />
          <FieldDescription>Sign-in email and tenant contact email.</FieldDescription>
        </FieldContent>
      </Field>
      <Field>
        <FieldLabel htmlFor="wiz-auser">Username</FieldLabel>
        <FieldContent>
          <Input
            id="wiz-auser"
            className="h-9 text-sm"
            autoComplete="username"
            placeholder="hospital-admin"
            {...register('adminUsername')}
          />
          <FieldDescription>Optional login alias.</FieldDescription>
        </FieldContent>
      </Field>
      <Field>
        <FieldLabel htmlFor="wiz-amobile">Mobile</FieldLabel>
        <FieldContent>
          <Input
            id="wiz-amobile"
            className="h-9 text-sm"
            type="tel"
            placeholder="+919876543210"
            {...register('adminMobile')}
          />
          <FieldDescription>Optional tenant contact phone.</FieldDescription>
        </FieldContent>
      </Field>
      <FieldGroup className="gap-4 rounded-lg border bg-muted/20 p-4">
        <div className="grid grid-cols-1 gap-x-6 gap-y-4 md:grid-cols-2">
          <Field>
            <FieldLabel htmlFor="wiz-pw">
              Password <span className="text-destructive">*</span>
            </FieldLabel>
            <FieldContent>
              <Input
                id="wiz-pw"
                className="h-9 text-sm"
                type="password"
                autoComplete="new-password"
                {...register('password')}
              />
            </FieldContent>
          </Field>
          <Field>
            <FieldLabel htmlFor="wiz-pw2">
              Confirm password <span className="text-destructive">*</span>
            </FieldLabel>
            <FieldContent>
              <Input
                id="wiz-pw2"
                className="h-9 text-sm"
                type="password"
                autoComplete="new-password"
                {...register('confirmPassword')}
              />
            </FieldContent>
          </Field>
        </div>
      </FieldGroup>
    </FieldGroup>
  );
}
