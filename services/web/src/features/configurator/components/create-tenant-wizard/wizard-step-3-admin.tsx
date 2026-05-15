import { Controller } from 'react-hook-form';
import type { Control, UseFormRegister } from 'react-hook-form';
import { Checkbox } from '@pulse/ui/checkbox';
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from '@pulse/ui/field';
import { Input } from '@pulse/ui/input';
import { Textarea } from '@pulse/ui/textarea';
import type { WizardFormValues } from '@/features/configurator/create-tenant-wizard-schema';

export interface WizardStep3AdminProps {
  register: UseFormRegister<WizardFormValues>;
  control: Control<WizardFormValues>;
  sendInvitation: boolean;
  welcomeLen: number;
}

export function WizardStep3Admin({ register, control, sendInvitation, welcomeLen }: WizardStep3AdminProps) {
  return (
    <FieldGroup className="mx-auto max-w-none gap-4">
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
          Admin email <span className="text-destructive">*</span>
        </FieldLabel>
        <FieldContent>
          <Input
            id="wiz-aemail"
            className="h-9 text-sm"
            type="email"
            placeholder="admin@example.com"
            {...register('adminEmail')}
          />
          <FieldDescription>Used as tenant contact email for now.</FieldDescription>
        </FieldContent>
      </Field>
      <Field>
        <FieldLabel htmlFor="wiz-amobile">
          Admin mobile <span className="text-destructive">*</span>
        </FieldLabel>
        <FieldContent>
          <Input
            id="wiz-amobile"
            className="h-9 text-sm"
            placeholder="+919876543210"
            {...register('adminMobile')}
          />
          <FieldDescription>Used as tenant contact phone for now.</FieldDescription>
        </FieldContent>
      </Field>
      <Field className="rounded-lg border bg-muted/20 p-4">
        <FieldContent className="flex flex-row items-start gap-3">
          <Controller
            name="sendInvitation"
            control={control}
            render={({ field }) => (
              <Checkbox
                checked={field.value}
                onCheckedChange={(v) => field.onChange(v === true)}
                id="wiz-invite"
                className="mt-0.5"
              />
            )}
          />
          <FieldLabel htmlFor="wiz-invite" className="w-full cursor-pointer text-xs font-normal leading-snug">
            Send invitation email (user sets password via link). If unchecked, set password below and share
            manually. (Invitation flow is not wired yet — stored in this form only.)
          </FieldLabel>
        </FieldContent>
      </Field>
      {!sendInvitation && (
        <FieldGroup className="gap-4 rounded-lg border bg-muted/20 p-4">
          <Field>
            <FieldDescription>
              If you set a password here, the admin could log in immediately once user management is
              connected. For now this stays on the client only.
            </FieldDescription>
          </Field>
          <div className="grid grid-cols-1 gap-x-6 gap-y-4 md:grid-cols-2">
            <Field>
              <FieldLabel htmlFor="wiz-pw">Optional password (min 8 chars)</FieldLabel>
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
              <FieldLabel htmlFor="wiz-pw2">Confirm optional password</FieldLabel>
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
      )}
      <Field>
        <FieldLabel htmlFor="wiz-welcome">Welcome message (optional)</FieldLabel>
        <FieldContent>
          <Textarea
            id="wiz-welcome"
            rows={3}
            maxLength={500}
            className="min-h-[72px] resize-y text-sm"
            placeholder="Custom message to append to invitation email…"
            {...register('welcomeMessage')}
          />
          <FieldDescription>{welcomeLen}/500 characters</FieldDescription>
        </FieldContent>
      </Field>
    </FieldGroup>
  );
}
