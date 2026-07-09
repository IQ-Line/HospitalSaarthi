import { useMemo, useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from '@pulse/ui/button';
import { Checkbox } from '@pulse/ui/checkbox';
import { Input } from '@pulse/ui/input';
import { Label } from '@pulse/ui/label';
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
import { listStateDistrictCatalog } from '@/features/frontdesk/utils/state-district-catalog';
import type { DispensePatientDraft } from '../../types/dispense-ui.types';

const GENDER_OPTIONS = [
  { value: 'male', label: 'Male' },
  { value: 'female', label: 'Female' },
  { value: 'other', label: 'Other' },
] as const;

const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'] as const;

const RELATION_OPTIONS = [
  'Self',
  'Spouse',
  'Parent',
  'Child',
  'Sibling',
  'Guardian',
  'Other',
] as const;

type DispensePatientFieldsProps = {
  value: DispensePatientDraft;
  onChange: (patch: Partial<DispensePatientDraft>) => void;
  disabled?: boolean;
};

export function DispensePatientFields({
  value,
  onChange,
  disabled = false,
}: DispensePatientFieldsProps) {
  const [expanded, setExpanded] = useState(false);
  const stateOptions = useMemo(() => listStateDistrictCatalog(), []);

  const patchAddress = (
    which: 'permanent_address' | 'residential_address',
    patch: Partial<DispensePatientDraft['permanent_address']>,
  ) => {
    onChange({
      [which]: { ...value[which], ...patch },
    });
  };

  const handleSameAsPermanent = (checked: boolean) => {
    onChange({
      residential_same_as_permanent: checked,
      residential_address: checked ? { ...value.permanent_address } : value.residential_address,
    });
  };

  return (
    <div className="flex flex-col gap-4">
      <RegistrationSection title="Patient Details">
        <RegistrationField>
          <RegistrationFieldLabel htmlFor="dispense-phone">Phone Number</RegistrationFieldLabel>
          <div className="flex h-9 items-center rounded-md border border-input bg-background focus-within:border-ring focus-within:ring-[3px] focus-within:ring-ring/50">
            <span className="shrink-0 pl-3 text-sm text-muted-foreground">+91</span>
            <Input
              id="dispense-phone"
              value={value.phone}
              disabled={disabled}
              inputMode="numeric"
              maxLength={10}
              placeholder="Enter 10-digit number"
              className="h-9 border-0 shadow-none focus-visible:ring-0"
              onChange={(e) =>
                onChange({ phone: e.target.value.replace(/\D/g, '').slice(0, 10) })
              }
            />
          </div>
        </RegistrationField>

        <div className="grid grid-cols-1 gap-3 md:grid-cols-3 md:items-end">
          <RegistrationField>
            <RegistrationFieldLabel htmlFor="dispense-first-name">First Name</RegistrationFieldLabel>
            <Input
              id="dispense-first-name"
              className="h-9"
              value={value.first_name}
              disabled={disabled}
              placeholder="Enter First Name"
              onChange={(e) => onChange({ first_name: e.target.value })}
            />
          </RegistrationField>
          <RegistrationField>
            <RegistrationFieldLabel htmlFor="dispense-middle-name">Middle Name</RegistrationFieldLabel>
            <Input
              id="dispense-middle-name"
              className="h-9"
              value={value.middle_name}
              disabled={disabled}
              onChange={(e) => onChange({ middle_name: e.target.value })}
            />
          </RegistrationField>
          <RegistrationField>
            <RegistrationFieldLabel htmlFor="dispense-last-name">Last Name</RegistrationFieldLabel>
            <Input
              id="dispense-last-name"
              className="h-9"
              value={value.last_name}
              disabled={disabled}
              placeholder="Enter Last Name"
              onChange={(e) => onChange({ last_name: e.target.value })}
            />
          </RegistrationField>
        </div>

        <div className="grid grid-cols-1 gap-3 lg:grid-cols-12 lg:items-end">
          <RegistrationField className="lg:col-span-4">
            <RegistrationFieldLabel>Gender</RegistrationFieldLabel>
            <ToggleGroup
              type="single"
              variant="outline"
              spacing={0}
              value={value.gender || undefined}
              disabled={disabled}
              onValueChange={(v) => {
                if (v === 'male' || v === 'female' || v === 'other') {
                  onChange({ gender: v });
                }
              }}
              className="w-full"
            >
              {GENDER_OPTIONS.map((g) => (
                <ToggleGroupItem
                  key={g.value}
                  value={g.value}
                  className="h-9 flex-1 px-3 capitalize data-[state=on]:border-primary data-[state=on]:bg-primary/5 data-[state=on]:text-primary"
                >
                  {g.label}
                </ToggleGroupItem>
              ))}
            </ToggleGroup>
          </RegistrationField>
          <RegistrationField className="lg:col-span-3">
            <RegistrationFieldLabel htmlFor="dispense-dob">Date of Birth</RegistrationFieldLabel>
            <Input
              id="dispense-dob"
              type="date"
              className="h-9"
              value={value.date_of_birth}
              disabled={disabled}
              onChange={(e) => onChange({ date_of_birth: e.target.value })}
            />
          </RegistrationField>
          <RegistrationField className="lg:col-span-1">
            <RegistrationFieldLabel htmlFor="dispense-age-yrs">Yrs</RegistrationFieldLabel>
            <Input
              id="dispense-age-yrs"
              className="h-9"
              inputMode="numeric"
              value={value.age_years}
              disabled={disabled}
              onChange={(e) => onChange({ age_years: e.target.value })}
            />
          </RegistrationField>
          <RegistrationField className="lg:col-span-2">
            <RegistrationFieldLabel htmlFor="dispense-age-mon">Mon</RegistrationFieldLabel>
            <Input
              id="dispense-age-mon"
              className="h-9"
              inputMode="numeric"
              value={value.age_months}
              disabled={disabled}
              onChange={(e) => onChange({ age_months: e.target.value })}
            />
          </RegistrationField>
          <RegistrationField className="lg:col-span-2">
            <RegistrationFieldLabel htmlFor="dispense-age-days">Days</RegistrationFieldLabel>
            <Input
              id="dispense-age-days"
              className="h-9"
              inputMode="numeric"
              value={value.age_days}
              disabled={disabled}
              onChange={(e) => onChange({ age_days: e.target.value })}
            />
          </RegistrationField>
        </div>

        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <RegistrationField>
            <RegistrationFieldLabel htmlFor="dispense-email">Email (Optional)</RegistrationFieldLabel>
            <Input
              id="dispense-email"
              type="email"
              className="h-9"
              value={value.email}
              disabled={disabled}
              onChange={(e) => onChange({ email: e.target.value })}
            />
          </RegistrationField>
          <RegistrationField>
            <RegistrationFieldLabel>Blood Group</RegistrationFieldLabel>
            <Select
              value={value.blood_group || undefined}
              disabled={disabled}
              onValueChange={(v) => onChange({ blood_group: v })}
            >
              <SelectTrigger className="h-9 w-full">
                <SelectValue placeholder="Select" />
              </SelectTrigger>
              <SelectContent>
                {BLOOD_GROUPS.map((bg) => (
                  <SelectItem key={bg} value={bg}>
                    {bg}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </RegistrationField>
        </div>

        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="-ml-2 h-8 text-muted-foreground hover:text-foreground"
          onClick={() => setExpanded((e) => !e)}
        >
          {expanded ? (
            <>
              <ChevronUp className="mr-1 size-4" />
              Show less
            </>
          ) : (
            <>
              <ChevronDown className="mr-1 size-4" />
              Add more details
            </>
          )}
        </Button>

        {expanded ? (
          <div className="flex flex-col gap-4">
            <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
              <RegistrationField>
                <RegistrationFieldLabel>UHID</RegistrationFieldLabel>
                <Input
                  className="h-9 bg-muted/40"
                  value={value.uhid}
                  readOnly
                  placeholder="Auto-generated on save"
                  disabled={disabled}
                />
              </RegistrationField>
              <RegistrationField>
                <RegistrationFieldLabel htmlFor="dispense-abha">ABHA Number</RegistrationFieldLabel>
                <Input
                  id="dispense-abha"
                  className="h-9"
                  value={value.abha_number}
                  disabled={disabled}
                  onChange={(e) => onChange({ abha_number: e.target.value })}
                />
              </RegistrationField>
              <RegistrationField>
                <RegistrationFieldLabel htmlFor="dispense-aadhaar">Aadhaar</RegistrationFieldLabel>
                <Input
                  id="dispense-aadhaar"
                  className="h-9"
                  value={value.aadhaar}
                  disabled={disabled}
                  onChange={(e) => onChange({ aadhaar: e.target.value })}
                />
              </RegistrationField>
            </div>

            <RegistrationSubsectionLabel>Attendant Details</RegistrationSubsectionLabel>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
              <RegistrationField>
                <RegistrationFieldLabel>Relation to Patient</RegistrationFieldLabel>
                <Select
                  value={value.attendant_relation || undefined}
                  disabled={disabled}
                  onValueChange={(v) => onChange({ attendant_relation: v })}
                >
                  <SelectTrigger className="h-9 w-full">
                    <SelectValue placeholder="Select" />
                  </SelectTrigger>
                  <SelectContent>
                    {RELATION_OPTIONS.map((rel) => (
                      <SelectItem key={rel} value={rel}>
                        {rel}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </RegistrationField>
              <RegistrationField>
                <RegistrationFieldLabel htmlFor="dispense-attendant-name">
                  Attendant Name
                </RegistrationFieldLabel>
                <Input
                  id="dispense-attendant-name"
                  className="h-9"
                  value={value.attendant_name}
                  disabled={disabled}
                  onChange={(e) => onChange({ attendant_name: e.target.value })}
                />
              </RegistrationField>
              <RegistrationField>
                <RegistrationFieldLabel htmlFor="dispense-attendant-phone">
                  Attendant Phone
                </RegistrationFieldLabel>
                <Input
                  id="dispense-attendant-phone"
                  className="h-9"
                  inputMode="numeric"
                  value={value.attendant_phone}
                  disabled={disabled}
                  onChange={(e) =>
                    onChange({ attendant_phone: e.target.value.replace(/\D/g, '').slice(0, 10) })
                  }
                />
              </RegistrationField>
            </div>

            <RegistrationSubsectionLabel>Permanent Address</RegistrationSubsectionLabel>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <RegistrationField>
                <RegistrationFieldLabel>Address Line 1</RegistrationFieldLabel>
                <Input
                  className="h-9"
                  value={value.permanent_address.line1}
                  disabled={disabled}
                  onChange={(e) => patchAddress('permanent_address', { line1: e.target.value })}
                />
              </RegistrationField>
              <RegistrationField>
                <RegistrationFieldLabel>Address Line 2</RegistrationFieldLabel>
                <Input
                  className="h-9"
                  value={value.permanent_address.line2}
                  disabled={disabled}
                  onChange={(e) => patchAddress('permanent_address', { line2: e.target.value })}
                />
              </RegistrationField>
              <RegistrationField>
                <RegistrationFieldLabel>City</RegistrationFieldLabel>
                <Input
                  className="h-9"
                  value={value.permanent_address.city}
                  disabled={disabled}
                  onChange={(e) => patchAddress('permanent_address', { city: e.target.value })}
                />
              </RegistrationField>
              <RegistrationField>
                <RegistrationFieldLabel>State</RegistrationFieldLabel>
                <Select
                  value={value.permanent_address.state || '__none__'}
                  disabled={disabled}
                  onValueChange={(v) =>
                    patchAddress('permanent_address', {
                      state: v === '__none__' ? '' : v,
                      district: '',
                    })
                  }
                >
                  <SelectTrigger className="h-9 w-full">
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
                <RegistrationFieldLabel>District</RegistrationFieldLabel>
                <Input
                  className="h-9"
                  value={value.permanent_address.district}
                  disabled={disabled}
                  onChange={(e) => patchAddress('permanent_address', { district: e.target.value })}
                />
              </RegistrationField>
              <RegistrationField>
                <RegistrationFieldLabel>Pincode</RegistrationFieldLabel>
                <Input
                  className="h-9"
                  inputMode="numeric"
                  maxLength={6}
                  value={value.permanent_address.pincode}
                  disabled={disabled}
                  onChange={(e) =>
                    patchAddress('permanent_address', {
                      pincode: e.target.value.replace(/\D/g, '').slice(0, 6),
                    })
                  }
                />
              </RegistrationField>
            </div>

            <RegistrationSubsectionLabel>Residential Address</RegistrationSubsectionLabel>
            <div className="flex items-center gap-2">
              <Checkbox
                id="dispense-same-address"
                checked={value.residential_same_as_permanent}
                disabled={disabled}
                onCheckedChange={(checked) => handleSameAsPermanent(checked === true)}
              />
              <Label htmlFor="dispense-same-address" className="text-sm font-normal">
                Same as Permanent Address
              </Label>
            </div>
            {!value.residential_same_as_permanent ? (
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                <RegistrationField>
                  <RegistrationFieldLabel>Address Line 1</RegistrationFieldLabel>
                  <Input
                    className="h-9"
                    value={value.residential_address.line1}
                    disabled={disabled}
                    onChange={(e) => patchAddress('residential_address', { line1: e.target.value })}
                  />
                </RegistrationField>
                <RegistrationField>
                  <RegistrationFieldLabel>Address Line 2</RegistrationFieldLabel>
                  <Input
                    className="h-9"
                    value={value.residential_address.line2}
                    disabled={disabled}
                    onChange={(e) => patchAddress('residential_address', { line2: e.target.value })}
                  />
                </RegistrationField>
                <RegistrationField>
                  <RegistrationFieldLabel>City</RegistrationFieldLabel>
                  <Input
                    className="h-9"
                    value={value.residential_address.city}
                    disabled={disabled}
                    onChange={(e) => patchAddress('residential_address', { city: e.target.value })}
                  />
                </RegistrationField>
                <RegistrationField>
                  <RegistrationFieldLabel>State</RegistrationFieldLabel>
                  <Input
                    className="h-9"
                    value={value.residential_address.state}
                    disabled={disabled}
                    onChange={(e) => patchAddress('residential_address', { state: e.target.value })}
                  />
                </RegistrationField>
                <RegistrationField>
                  <RegistrationFieldLabel>District</RegistrationFieldLabel>
                  <Input
                    className="h-9"
                    value={value.residential_address.district}
                    disabled={disabled}
                    onChange={(e) =>
                      patchAddress('residential_address', { district: e.target.value })
                    }
                  />
                </RegistrationField>
                <RegistrationField>
                  <RegistrationFieldLabel>Pincode</RegistrationFieldLabel>
                  <Input
                    className="h-9"
                    inputMode="numeric"
                    maxLength={6}
                    value={value.residential_address.pincode}
                    disabled={disabled}
                    onChange={(e) =>
                      patchAddress('residential_address', {
                        pincode: e.target.value.replace(/\D/g, '').slice(0, 6),
                      })
                    }
                  />
                </RegistrationField>
              </div>
            ) : null}

            <RegistrationSubsectionLabel>Other Details</RegistrationSubsectionLabel>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
              <RegistrationField>
                <RegistrationFieldLabel>Education</RegistrationFieldLabel>
                <Input
                  className="h-9"
                  value={value.education}
                  disabled={disabled}
                  onChange={(e) => onChange({ education: e.target.value })}
                />
              </RegistrationField>
              <RegistrationField>
                <RegistrationFieldLabel>Occupation</RegistrationFieldLabel>
                <Input
                  className="h-9"
                  value={value.occupation}
                  disabled={disabled}
                  onChange={(e) => onChange({ occupation: e.target.value })}
                />
              </RegistrationField>
              <RegistrationField>
                <RegistrationFieldLabel>Religion</RegistrationFieldLabel>
                <Input
                  className="h-9"
                  value={value.religion}
                  disabled={disabled}
                  onChange={(e) => onChange({ religion: e.target.value })}
                />
              </RegistrationField>
            </div>
          </div>
        ) : null}
      </RegistrationSection>
    </div>
  );
}
