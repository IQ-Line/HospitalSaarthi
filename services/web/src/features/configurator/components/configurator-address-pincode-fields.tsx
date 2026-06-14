import { Loader2 } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Controller, type Control, type FieldErrors, type FieldPath, type UseFormRegister, type UseFormSetValue, type UseFormWatch } from 'react-hook-form';
import { toast } from 'sonner';
import { cn } from '@pulse/utils';
import { Input } from '@pulse/ui/input';
import {
  Field,
  FieldContent,
  FieldError,
  FieldLabel,
} from '@pulse/ui/field';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@pulse/ui/select';
import { INDIAN_STATE_OPTIONS } from '@/features/configurator/create-tenant-wizard-schema';
import {
  fetchIndianPincodePostOffices,
  mapPostOfficeToAddressFields,
  sanitizeIndianPincodeInput,
  type IndianPostOffice,
} from '@/lib/india-postal-pincode';

type AddressPincodeFieldValues = {
  locality?: string;
  block?: string;
  district: string;
  state: string;
  pinCode: string;
};

type ConfiguratorAddressPincodeFieldsProps<T extends AddressPincodeFieldValues> = {
  register: UseFormRegister<T>;
  control: Control<T>;
  errors: FieldErrors<T>;
  setValue: UseFormSetValue<T>;
  watch: UseFormWatch<T>;
  idPrefix: string;
};

export function ConfiguratorAddressPincodeFields<T extends AddressPincodeFieldValues>({
  register,
  control,
  errors,
  setValue,
  watch,
  idPrefix,
}: ConfiguratorAddressPincodeFieldsProps<T>) {
  const pinCode = watch('pinCode' as FieldPath<T>) ?? '';
  const normalizedPin = sanitizeIndianPincodeInput(String(pinCode));
  const lastAppliedPinRef = useRef('');
  const pinFieldRef = useRef<HTMLDivElement>(null);
  const [dismissedSuggestionsPin, setDismissedSuggestionsPin] = useState('');

  const pincodeQuery = useQuery({
    queryKey: ['indian-pincode', normalizedPin],
    queryFn: () => fetchIndianPincodePostOffices(normalizedPin),
    enabled: normalizedPin.length === 6,
    staleTime: 24 * 60 * 60 * 1000,
    retry: 1,
  });

  const applyPostOffice = useCallback(
    (postOffice: IndianPostOffice) => {
      const fields = mapPostOfficeToAddressFields(postOffice, INDIAN_STATE_OPTIONS);
      setValue('locality' as FieldPath<T>, fields.locality as never, { shouldDirty: true });
      setValue('block' as FieldPath<T>, fields.block as never, { shouldDirty: true });
      setValue('district' as FieldPath<T>, fields.district as never, {
        shouldDirty: true,
        shouldValidate: true,
      });
      setValue('state' as FieldPath<T>, fields.state as never, {
        shouldDirty: true,
        shouldValidate: true,
      });
    },
    [setValue],
  );

  useEffect(() => {
    if (normalizedPin.length === 6) return;
    if (!lastAppliedPinRef.current) return;
    lastAppliedPinRef.current = '';
    setDismissedSuggestionsPin('');
    setValue('locality' as FieldPath<T>, '' as never, { shouldDirty: true });
    setValue('block' as FieldPath<T>, '' as never, { shouldDirty: true });
    setValue('district' as FieldPath<T>, '' as never, { shouldDirty: true });
    setValue('state' as FieldPath<T>, '' as never, { shouldDirty: true });
  }, [normalizedPin, setValue]);

  useEffect(() => {
    if (normalizedPin.length !== 6) {
      setDismissedSuggestionsPin('');
    }
  }, [normalizedPin]);

  useEffect(() => {
    if (normalizedPin.length !== 6) return;
    if (pincodeQuery.isError) {
      toast.error('Failed to fetch address for this PIN code');
      return;
    }
    if (!pincodeQuery.isSuccess) return;

    const offices = pincodeQuery.data;
    if (offices.length === 0) {
      toast.warning('No post offices found for this PIN code');
      return;
    }

    if (offices.length === 1 && lastAppliedPinRef.current !== normalizedPin) {
      lastAppliedPinRef.current = normalizedPin;
      applyPostOffice(offices[0]!);
    }
  }, [applyPostOffice, normalizedPin, pincodeQuery.data, pincodeQuery.isError, pincodeQuery.isSuccess]);

  const postOffices = pincodeQuery.data ?? [];
  const showPostOfficeSuggestions =
    normalizedPin.length === 6 &&
    postOffices.length > 1 &&
    lastAppliedPinRef.current !== normalizedPin &&
    dismissedSuggestionsPin !== normalizedPin &&
    pincodeQuery.isSuccess;

  const handlePostOfficeSelect = (office: IndianPostOffice) => {
    lastAppliedPinRef.current = normalizedPin;
    applyPostOffice(office);
    setDismissedSuggestionsPin('');
  };

  useEffect(() => {
    if (!showPostOfficeSuggestions) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (!pinFieldRef.current?.contains(event.target as Node)) {
        setDismissedSuggestionsPin(normalizedPin);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [normalizedPin, showPostOfficeSuggestions]);

  return (
    <>
      <Field>
        <FieldLabel htmlFor={`${idPrefix}-pin`}>
          PIN code <span className="text-destructive">*</span>
        </FieldLabel>
        <FieldContent>
          <div ref={pinFieldRef} className="relative">
            <Controller
              name={'pinCode' as FieldPath<T>}
              control={control}
              render={({ field }) => (
                <Input
                  id={`${idPrefix}-pin`}
                  className="h-9 text-sm"
                  placeholder="123456"
                  maxLength={6}
                  inputMode="numeric"
                  autoComplete="postal-code"
                  value={String(field.value ?? '')}
                  onChange={(event) => {
                    const nextPin = sanitizeIndianPincodeInput(event.target.value);
                    if (nextPin !== normalizedPin) {
                      lastAppliedPinRef.current = '';
                      setDismissedSuggestionsPin('');
                    }
                    field.onChange(nextPin);
                  }}
                  onBlur={field.onBlur}
                  onFocus={() => {
                    if (normalizedPin.length === 6 && dismissedSuggestionsPin === normalizedPin) {
                      setDismissedSuggestionsPin('');
                    }
                  }}
                />
              )}
            />
            {pincodeQuery.isFetching ? (
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
          <FieldError errors={errors.pinCode ? [errors.pinCode as never] : undefined} />
        </FieldContent>
      </Field>

      <Field>
        <FieldLabel htmlFor={`${idPrefix}-locality`}>Locality</FieldLabel>
        <FieldContent>
          <Input id={`${idPrefix}-locality`} className="h-9 text-sm" placeholder="Locality" {...register('locality' as FieldPath<T>)} />
        </FieldContent>
      </Field>
      <Field>
        <FieldLabel htmlFor={`${idPrefix}-block`}>Block</FieldLabel>
        <FieldContent>
          <Input id={`${idPrefix}-block`} className="h-9 text-sm" placeholder="Block" {...register('block' as FieldPath<T>)} />
        </FieldContent>
      </Field>
      <Field>
        <FieldLabel htmlFor={`${idPrefix}-district`}>
          District <span className="text-destructive">*</span>
        </FieldLabel>
        <FieldContent>
          <Input id={`${idPrefix}-district`} className="h-9 text-sm" placeholder="District" {...register('district' as FieldPath<T>)} />
          <FieldError errors={errors.district ? [errors.district as never] : undefined} />
        </FieldContent>
      </Field>
      <Field>
        <FieldLabel id={`${idPrefix}-state-label`}>
          State <span className="text-destructive">*</span>
        </FieldLabel>
        <FieldContent>
          <Controller
            name={'state' as FieldPath<T>}
            control={control}
            render={({ field }) => (
              <Select value={field.value || undefined} onValueChange={field.onChange}>
                <SelectTrigger className="h-9 w-full text-sm" aria-labelledby={`${idPrefix}-state-label`}>
                  <SelectValue placeholder="Select state" />
                </SelectTrigger>
                <SelectContent>
                  {INDIAN_STATE_OPTIONS.map((state) => (
                    <SelectItem key={state.value} value={state.value}>
                      {state.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
          <FieldError errors={errors.state ? [errors.state as never] : undefined} />
        </FieldContent>
      </Field>
    </>
  );
}
