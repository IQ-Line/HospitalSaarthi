import { Loader2 } from 'lucide-react';
import { cn } from '@pulse/utils';
import { Input } from '@pulse/ui/input';
import { Label } from '@pulse/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@pulse/ui/select';
import { INDIAN_STATE_OPTIONS } from '@/features/configurator/create-tenant-wizard-schema';
import { useIndianPincodeAutofill } from '@/features/configurator/hooks/use-indian-pincode-autofill';

export type IndianPincodeAddressValues = {
  locality: string;
  block: string;
  district: string;
  state: string;
  pinCode: string;
};

type IndianPincodeAddressFieldsProps = {
  idPrefix: string;
  values: IndianPincodeAddressValues;
  initialPinCode?: string;
  onFieldChange: <K extends keyof IndianPincodeAddressValues>(
    field: K,
    value: IndianPincodeAddressValues[K],
  ) => void;
  districtLabel?: string;
  pinRequired?: boolean;
  districtRequired?: boolean;
};

export function IndianPincodeAddressFields({
  idPrefix,
  values,
  initialPinCode,
  onFieldChange,
  districtLabel = 'District',
  pinRequired = false,
  districtRequired = false,
}: IndianPincodeAddressFieldsProps) {
  const {
    pinFieldRef,
    isFetching,
    showPostOfficeSuggestions,
    postOffices,
    handlePinChange,
    handlePinFocus,
    handlePostOfficeSelect,
  } = useIndianPincodeAutofill({
    pinCode: values.pinCode,
    initialPinCode,
    onAutofill: (fields) => {
      onFieldChange('locality', fields.locality);
      onFieldChange('block', fields.block);
      onFieldChange('district', fields.district);
      onFieldChange('state', fields.state);
    },
    onClearAutofill: () => {
      onFieldChange('locality', '');
      onFieldChange('block', '');
      onFieldChange('district', '');
      onFieldChange('state', '');
    },
  });

  return (
    <>
      <div className="space-y-1.5">
        <Label htmlFor={`${idPrefix}-pin`}>
          PIN code{pinRequired ? <span className="text-destructive"> *</span> : null}
        </Label>
        <div ref={pinFieldRef} className="relative">
          <Input
            id={`${idPrefix}-pin`}
            inputMode="numeric"
            maxLength={6}
            autoComplete="postal-code"
            placeholder="123456"
            value={values.pinCode}
            onChange={(event) => onFieldChange('pinCode', handlePinChange(event.target.value))}
            onFocus={handlePinFocus}
          />
          {isFetching ? (
            <Loader2 className="pointer-events-none absolute top-1/2 right-2 size-4 -translate-y-1/2 animate-spin text-muted-foreground" />
          ) : null}
          {showPostOfficeSuggestions ? (
            <div
              className="absolute top-full right-0 left-0 z-50 mt-1 max-h-48 overflow-y-auto rounded-md border border-border bg-popover shadow-md"
              role="listbox"
              aria-label="Post office suggestions"
            >
              <p className="px-2 py-1.5 text-[11px] text-muted-foreground">
                Select post office to autofill address
              </p>
              {postOffices.map((office) => (
                <button
                  key={office.Name}
                  type="button"
                  role="option"
                  className={cn(
                    'flex w-full px-2 py-2 text-left text-sm hover:bg-muted',
                    'border-t border-border first:border-t-0',
                  )}
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => handlePostOfficeSelect(office)}
                >
                  {office.Name}
                </button>
              ))}
            </div>
          ) : null}
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor={`${idPrefix}-locality`}>Locality (optional)</Label>
        <Input
          id={`${idPrefix}-locality`}
          value={values.locality}
          onChange={(event) => onFieldChange('locality', event.target.value)}
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor={`${idPrefix}-block`}>Block (optional)</Label>
        <Input
          id={`${idPrefix}-block`}
          value={values.block}
          onChange={(event) => onFieldChange('block', event.target.value)}
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor={`${idPrefix}-district`}>
          {districtLabel}
          {districtRequired ? <span className="text-destructive"> *</span> : null}
        </Label>
        <Input
          id={`${idPrefix}-district`}
          value={values.district}
          onChange={(event) => onFieldChange('district', event.target.value)}
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor={`${idPrefix}-state`}>State</Label>
        <Select value={values.state || undefined} onValueChange={(value) => onFieldChange('state', value)}>
          <SelectTrigger id={`${idPrefix}-state`}>
            <SelectValue placeholder="Select state" />
          </SelectTrigger>
          <SelectContent>
            {INDIAN_STATE_OPTIONS.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </>
  );
}
