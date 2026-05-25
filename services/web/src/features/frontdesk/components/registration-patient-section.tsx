import { Calendar } from 'lucide-react';
import { useMemo, type ChangeEvent, type Ref } from 'react';
import type { ChangeHandler, UseFormReturn } from 'react-hook-form';
import { Button } from '@pulse/ui/button';
import { Input } from '@pulse/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@pulse/ui/select';
import { ToggleGroup, ToggleGroupItem } from '@pulse/ui/toggle-group';
import {
  RegistrationField,
  RegistrationFieldLabel,
  RegistrationSection,
  RegistrationSubsectionLabel,
} from '@/features/frontdesk/components/registration-form-chrome';
import type { CreateVisitRequestBody } from '@/features/frontdesk/types';
import {
  listDistrictsForStateCode,
  listStateDistrictCatalog,
} from '@/features/frontdesk/utils/state-district-catalog';

type PatientSectionProps = {
  form: UseFormReturn<CreateVisitRequestBody>;
  onCreateAbha: () => void;
  patientPhoneRef: Ref<HTMLInputElement>;
  patientPhoneName: string;
  patientPhoneOnBlur: ChangeHandler;
  patientPhoneRhfOnChange: (e: ChangeEvent<HTMLInputElement>) => void;
};

const GENDER_OPTIONS = [
  { value: 'male', label: 'Male' },
  { value: 'female', label: 'Female' },
  { value: 'other', label: 'Other' },
] as const;

export function RegistrationPatientSection({
  form,
  onCreateAbha,
  patientPhoneRef,
  patientPhoneName,
  patientPhoneOnBlur,
  patientPhoneRhfOnChange,
}: PatientSectionProps) {
  const gender = form.watch('patient.gender') ?? 'male';
  const stateCode = form.watch('permanent_address.state') ?? '';
  const districtCode = form.watch('permanent_address.district') ?? '';
  const register = form.register;

  const stateOptions = useMemo(() => listStateDistrictCatalog(), []);
  const districtOptions = useMemo(
    () => listDistrictsForStateCode(stateCode),
    [stateCode],
  );
  const districtSelectDisabled = !stateCode;

  return (
    <RegistrationSection title="Patient Details">
      <RegistrationField>
        <RegistrationFieldLabel htmlFor="visit-reg-phone" required>
          Phone Number
        </RegistrationFieldLabel>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-stretch">
          <Input
            id="visit-reg-phone"
            name={patientPhoneName}
            ref={patientPhoneRef}
            onBlur={patientPhoneOnBlur}
            onChange={(e: ChangeEvent<HTMLInputElement>) => {
              const el = e.target;
              el.value = el.value.replace(/\D/g, '').slice(0, 10);
              void patientPhoneRhfOnChange(e);
            }}
            className="h-10 min-w-0 sm:max-w-[14rem] sm:shrink-0"
            inputMode="numeric"
            autoComplete="tel-national"
            maxLength={10}
            placeholder="Enter 10-digit number"
          />
          <Button
            type="button"
            variant="outline"
            className="h-10 flex-1 px-4"
            onClick={onCreateAbha}
          >
            Create ABHA
          </Button>
          <Button type="button" variant="outline" className="h-10 flex-1 px-4" disabled>
            Verify ABHA
          </Button>
        </div>
        {form.formState.errors.patient?.phone ? (
          <p className="text-sm text-destructive" role="alert">
            {form.formState.errors.patient.phone.message}
          </p>
        ) : null}
      </RegistrationField>

      <RegistrationSubsectionLabel>Patient Details</RegistrationSubsectionLabel>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <RegistrationField>
          <RegistrationFieldLabel required>First Name</RegistrationFieldLabel>
          <Input
            className="h-10"
            placeholder="Enter First Name"
            {...register('patient.first_name', {
              required: 'First name is required',
              validate: (v) => Boolean(v?.trim()) || 'First name is required',
            })}
          />
          {form.formState.errors.patient?.first_name ? (
            <p className="text-sm text-destructive" role="alert">
              {form.formState.errors.patient.first_name.message}
            </p>
          ) : null}
        </RegistrationField>
        <RegistrationField>
          <RegistrationFieldLabel>Middle Name</RegistrationFieldLabel>
          <Input className="h-10" {...register('patient.middle_name')} />
        </RegistrationField>
        <RegistrationField>
          <RegistrationFieldLabel>Last Name</RegistrationFieldLabel>
          <Input className="h-10" placeholder="Enter Last Name" {...register('patient.last_name')} />
        </RegistrationField>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-12 lg:items-end">
        <RegistrationField className="lg:col-span-4">
          <RegistrationFieldLabel required>Gender</RegistrationFieldLabel>
          <ToggleGroup
            type="single"
            variant="outline"
            spacing={0}
            value={gender}
            onValueChange={(v) => {
              if (v === 'male' || v === 'female' || v === 'other') {
                form.setValue('patient.gender', v);
              }
            }}
            className="w-full"
          >
            {GENDER_OPTIONS.map((g) => (
              <ToggleGroupItem
                key={g.value}
                value={g.value}
                className="h-10 flex-1 px-3 capitalize data-[state=on]:border-primary data-[state=on]:bg-primary/5 data-[state=on]:text-primary"
              >
                {g.label}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
        </RegistrationField>
        <RegistrationField className="lg:col-span-3">
          <RegistrationFieldLabel htmlFor="visit-reg-dob">Date of Birth</RegistrationFieldLabel>
          <div className="relative">
            <Input
              id="visit-reg-dob"
              type="date"
              className="h-10 w-full pr-10"
              {...register('patient.date_of_birth')}
            />
            <Calendar
              className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
              aria-hidden
            />
          </div>
        </RegistrationField>
        <RegistrationField className="lg:col-span-1">
          <RegistrationFieldLabel htmlFor="visit-reg-age-yrs" required>
            Years
          </RegistrationFieldLabel>
          <Input
            id="visit-reg-age-yrs"
            type="number"
            min={0}
            max={125}
            placeholder="0-125"
            className="h-10"
            {...register('patient.age_years', { valueAsNumber: true })}
          />
        </RegistrationField>
        <RegistrationField className="lg:col-span-2">
          <RegistrationFieldLabel htmlFor="visit-reg-age-mon">Months</RegistrationFieldLabel>
          <Input
            id="visit-reg-age-mon"
            type="number"
            min={0}
            max={11}
            placeholder="0-11"
            className="h-10"
            {...register('patient.age_months', { valueAsNumber: true })}
          />
        </RegistrationField>
        <RegistrationField className="lg:col-span-2">
          <RegistrationFieldLabel htmlFor="visit-reg-age-days">Days</RegistrationFieldLabel>
          <Input
            id="visit-reg-age-days"
            type="number"
            min={0}
            max={30}
            placeholder="0-30"
            className="h-10"
            {...register('patient.age_days', { valueAsNumber: true })}
          />
        </RegistrationField>
      </div>

      <RegistrationSubsectionLabel>Address</RegistrationSubsectionLabel>
      <RegistrationField>
        <RegistrationFieldLabel htmlFor="visit-reg-addr-line1">Address Line 1</RegistrationFieldLabel>
        <Input id="visit-reg-addr-line1" className="h-10" {...register('permanent_address.line1')} />
      </RegistrationField>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <RegistrationField>
          <RegistrationFieldLabel required>State</RegistrationFieldLabel>
          <Select
            value={stateCode || '__none__'}
            onValueChange={(v) => {
              const nextState = v === '__none__' ? '' : v;
              form.setValue('permanent_address.state', nextState);
              form.setValue('permanent_address.district', '');
            }}
          >
            <SelectTrigger className="h-10">
              <SelectValue placeholder="Select State" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__none__">Select State</SelectItem>
              {stateOptions.map((state) => (
                <SelectItem key={state.state_code} value={String(state.state_code)}>
                  {state.state}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </RegistrationField>
        <RegistrationField>
          <RegistrationFieldLabel required>District</RegistrationFieldLabel>
          <Select
            value={districtCode || '__none__'}
            disabled={districtSelectDisabled}
            onValueChange={(v) =>
              form.setValue('permanent_address.district', v === '__none__' ? '' : v)
            }
          >
            <SelectTrigger className="h-10">
              <SelectValue placeholder="Select District" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__none__">Select District</SelectItem>
              {districtOptions.map((district) => (
                <SelectItem key={district.code} value={String(district.code)}>
                  {district.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </RegistrationField>
        <RegistrationField>
          <RegistrationFieldLabel htmlFor="visit-reg-pin">PIN Code</RegistrationFieldLabel>
          <Input
            id="visit-reg-pin"
            className="h-10"
            placeholder="Enter 6-digit PIN code"
            maxLength={6}
            inputMode="numeric"
            {...register('permanent_address.pincode')}
          />
        </RegistrationField>
      </div>
    </RegistrationSection>
  );
}
