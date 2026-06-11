import type { ReactNode } from 'react';
import { Input } from '@pulse/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@pulse/ui/select';
import type { WalkInPatientDraft } from '../types';

const GENDER_OPTIONS = [
  { value: 'male', label: 'Male' },
  { value: 'female', label: 'Female' },
  { value: 'other', label: 'Other' },
] as const;

type WalkInPatientFieldsProps = {
  value: WalkInPatientDraft;
  onChange: (patch: Partial<WalkInPatientDraft>) => void;
  disabled?: boolean;
  errors?: Partial<Record<keyof WalkInPatientDraft, string>>;
};

function FieldLabel({
  htmlFor,
  children,
  required,
}: {
  htmlFor?: string;
  children: ReactNode;
  required?: boolean;
}) {
  return (
    <label htmlFor={htmlFor} className="text-sm font-medium text-foreground">
      {children}
      {required ? <span className="text-destructive"> *</span> : null}
    </label>
  );
}

export function WalkInPatientFields({
  value,
  onChange,
  disabled = false,
  errors,
}: WalkInPatientFieldsProps) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <div className="grid gap-1.5">
          <FieldLabel htmlFor="walk-in-first-name" required>
            First name
          </FieldLabel>
          <Input
            id="walk-in-first-name"
            value={value.first_name}
            disabled={disabled}
            placeholder="Enter first name"
            className="h-10 bg-muted/20"
            onChange={(event) => onChange({ first_name: event.target.value })}
          />
          {errors?.first_name ? (
            <p className="text-sm text-destructive">{errors.first_name}</p>
          ) : null}
        </div>

        <div className="grid gap-1.5">
          <FieldLabel htmlFor="walk-in-last-name">Last name</FieldLabel>
          <Input
            id="walk-in-last-name"
            value={value.last_name}
            disabled={disabled}
            placeholder="Enter last name"
            className="h-10 bg-muted/20"
            onChange={(event) => onChange({ last_name: event.target.value })}
          />
        </div>

        <div className="grid gap-1.5">
          <FieldLabel htmlFor="walk-in-phone">Phone</FieldLabel>
          <div className="flex h-10 overflow-hidden rounded-md border border-input bg-background">
            <span className="inline-flex items-center border-r border-input bg-muted/30 px-3 text-sm text-muted-foreground">
              +91
            </span>
            <Input
              id="walk-in-phone"
              value={value.phone}
              disabled={disabled}
              inputMode="numeric"
              autoComplete="tel-national"
              maxLength={10}
              placeholder="10-digit mobile"
              className="h-10 border-0 bg-transparent shadow-none focus-visible:ring-0"
              onChange={(event) =>
                onChange({ phone: event.target.value.replace(/\D/g, '').slice(0, 10) })
              }
            />
          </div>
          {errors?.phone ? <p className="text-sm text-destructive">{errors.phone}</p> : null}
        </div>

        <div className="grid gap-1.5">
          <FieldLabel required>Gender</FieldLabel>
          <Select
            value={value.gender || undefined}
            disabled={disabled}
            onValueChange={(gender) =>
              onChange({ gender: gender as WalkInPatientDraft['gender'] })
            }
          >
            <SelectTrigger className="h-10 w-full bg-muted/20">
              <SelectValue placeholder="Select" />
            </SelectTrigger>
            <SelectContent>
              {GENDER_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {errors?.gender ? <p className="text-sm text-destructive">{errors.gender}</p> : null}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:max-w-xs">
        <div className="grid gap-1.5">
          <FieldLabel htmlFor="walk-in-dob">Date of birth</FieldLabel>
          <Input
            id="walk-in-dob"
            type="date"
            value={value.date_of_birth}
            disabled={disabled}
            className="h-10 bg-muted/20"
            onChange={(event) => onChange({ date_of_birth: event.target.value })}
          />
        </div>
      </div>
    </div>
  );
}

export function defaultWalkInPatientDraft(): WalkInPatientDraft {
  return {
    first_name: '',
    last_name: '',
    phone: '',
    gender: '',
    date_of_birth: '',
  };
}

export function validateWalkInPatientDraft(
  patient: WalkInPatientDraft,
): Partial<Record<keyof WalkInPatientDraft, string>> {
  const errors: Partial<Record<keyof WalkInPatientDraft, string>> = {};

  if (!patient.first_name.trim()) {
    errors.first_name = 'First name is required.';
  }
  if (!patient.gender) {
    errors.gender = 'Gender is required.';
  }
  if (patient.phone.trim() && patient.phone.trim().length !== 10) {
    errors.phone = 'Enter a 10-digit mobile number.';
  }

  return errors;
}
