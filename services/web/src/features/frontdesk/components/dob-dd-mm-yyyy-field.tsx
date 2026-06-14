import { useEffect, useMemo, useRef, useState } from 'react';
import { CalendarIcon } from 'lucide-react';
import type { Control, FieldPath, FieldValues } from 'react-hook-form';
import { Controller } from 'react-hook-form';
import { Button } from '@pulse/ui/button';
import { Calendar } from '@pulse/ui/calendar';
import { Input } from '@pulse/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@pulse/ui/popover';
import {
  DOB_INVALID_MESSAGE,
  formatLocalDateToIso,
  getDobSelectableBounds,
  hasAnyDobPart,
  isDobSelectableDate,
  joinDobPartsToIso,
  parseIsoDateOnly,
  sanitizeDobDayInput,
  sanitizeDobMonthInput,
  sanitizeDobYearInput,
  splitIsoToDobParts,
  validateDobIso,
  type DobParts,
} from '@/lib/dob-dd-mm-yyyy';

type DobDdMmYyyyFieldProps<T extends FieldValues> = {
  control: Control<T>;
  name: FieldPath<T>;
  idPrefix?: string;
  disabled?: boolean;
};

export function DobDdMmYyyyField<T extends FieldValues>({
  control,
  name,
  idPrefix = 'visit-reg-dob',
  disabled,
}: DobDdMmYyyyFieldProps<T>) {
  return (
    <Controller
      control={control}
      name={name}
      render={({ field, fieldState }) => (
        <DobDdMmYyyyInputs
          idPrefix={idPrefix}
          disabled={disabled}
          isoValue={typeof field.value === 'string' ? field.value : ''}
          error={fieldState.error?.message}
          onIsoChange={field.onChange}
          onBlur={field.onBlur}
        />
      )}
    />
  );
}

type DobDdMmYyyyInputsProps = {
  idPrefix: string;
  disabled?: boolean;
  isoValue: string;
  error?: string;
  onIsoChange: (iso: string) => void;
  onBlur: () => void;
};

function DobDdMmYyyyInputs({
  idPrefix,
  disabled,
  isoValue,
  error,
  onIsoChange,
  onBlur,
}: DobDdMmYyyyInputsProps) {
  const [parts, setParts] = useState<DobParts>(() => splitIsoToDobParts(isoValue));
  const [localError, setLocalError] = useState<string | null>(null);
  const [calendarOpen, setCalendarOpen] = useState(false);
  const focusedRef = useRef(false);
  const lastIsoRef = useRef(isoValue);
  const monthRef = useRef<HTMLInputElement>(null);
  const yearRef = useRef<HTMLInputElement>(null);
  const dobBounds = useMemo(() => getDobSelectableBounds(), []);
  const selectedDate = useMemo(() => parseIsoDateOnly(isoValue) ?? undefined, [isoValue]);

  useEffect(() => {
    if (focusedRef.current || isoValue === lastIsoRef.current) return;
    lastIsoRef.current = isoValue;
    setParts(splitIsoToDobParts(isoValue));
    setLocalError(null);
  }, [isoValue]);

  const commitParts = (next: DobParts) => {
    setParts(next);
    if (!hasAnyDobPart(next)) {
      lastIsoRef.current = '';
      onIsoChange('');
      setLocalError(null);
      return;
    }

    const iso = joinDobPartsToIso(next.day, next.month, next.year);
    if (!iso) {
      lastIsoRef.current = '';
      onIsoChange('');
      setLocalError(null);
      return;
    }

    const validationError = validateDobIso(iso);
    if (validationError) {
      lastIsoRef.current = '';
      onIsoChange('');
      setLocalError(validationError);
      return;
    }

    lastIsoRef.current = iso;
    onIsoChange(iso);
    setLocalError(null);
  };

  const handlePartBlur = () => {
    onBlur();
    if (!hasAnyDobPart(parts)) return;
    const iso = joinDobPartsToIso(parts.day, parts.month, parts.year);
    if (!iso) {
      setLocalError(DOB_INVALID_MESSAGE);
      return;
    }
    const validationError = validateDobIso(iso);
    if (validationError) {
      setLocalError(validationError);
    }
  };

  const handleCalendarSelect = (date: Date | undefined) => {
    if (!date) return;

    const iso = formatLocalDateToIso(date);
    const validationError = validateDobIso(iso);
    if (validationError) return;

    lastIsoRef.current = iso;
    setParts(splitIsoToDobParts(iso));
    onIsoChange(iso);
    setLocalError(null);
    setCalendarOpen(false);
    onBlur();
  };

  const inputClass = 'h-10 text-center tabular-nums';

  return (
    <div className="space-y-1">
      <div className="flex items-center gap-1.5">
        <Input
          id={`${idPrefix}-day`}
          type="text"
          inputMode="numeric"
          autoComplete="bday-day"
          placeholder="DD"
          maxLength={2}
          disabled={disabled}
          className={`${inputClass} w-14`}
          value={parts.day}
          onFocus={() => {
            focusedRef.current = true;
          }}
          onBlur={() => {
            focusedRef.current = false;
            handlePartBlur();
          }}
          onChange={(event) => {
            const day = sanitizeDobDayInput(event.target.value);
            const next = { ...parts, day };
            commitParts(next);
            if (day.length === 2) {
              monthRef.current?.focus();
            }
          }}
        />
        <span className="text-muted-foreground" aria-hidden>
          -
        </span>
        <Input
          ref={monthRef}
          id={`${idPrefix}-month`}
          type="text"
          inputMode="numeric"
          autoComplete="bday-month"
          placeholder="MM"
          maxLength={2}
          disabled={disabled}
          className={`${inputClass} w-14`}
          value={parts.month}
          onFocus={() => {
            focusedRef.current = true;
          }}
          onBlur={() => {
            focusedRef.current = false;
            handlePartBlur();
          }}
          onChange={(event) => {
            const month = sanitizeDobMonthInput(event.target.value);
            const next = { ...parts, month };
            commitParts(next);
            if (month.length === 2) {
              yearRef.current?.focus();
            }
          }}
        />
        <span className="text-muted-foreground" aria-hidden>
          -
        </span>
        <Input
          ref={yearRef}
          id={`${idPrefix}-year`}
          type="text"
          inputMode="numeric"
          autoComplete="bday-year"
          placeholder="YYYY"
          maxLength={4}
          disabled={disabled}
          className={`${inputClass} w-[4.5rem]`}
          value={parts.year}
          onFocus={() => {
            focusedRef.current = true;
          }}
          onBlur={() => {
            focusedRef.current = false;
            handlePartBlur();
          }}
          onChange={(event) => {
            const year = sanitizeDobYearInput(event.target.value);
            commitParts({ ...parts, year });
          }}
        />
        <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
          <PopoverTrigger asChild>
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="size-10 shrink-0"
              disabled={disabled}
              aria-label="Pick date from calendar"
            >
              <CalendarIcon className="size-4" />
            </Button>
          </PopoverTrigger>
          <PopoverContent
            className="w-auto p-0"
            align="end"
            onOpenAutoFocus={(event) => event.preventDefault()}
          >
            <Calendar
              mode="single"
              captionLayout="dropdown"
              selected={selectedDate}
              onSelect={handleCalendarSelect}
              defaultMonth={selectedDate ?? dobBounds.max}
              startMonth={dobBounds.min}
              endMonth={dobBounds.max}
              disabled={(date) => !isDobSelectableDate(date)}
            />
          </PopoverContent>
        </Popover>
      </div>
      {localError || error ? (
        <p className="text-sm text-destructive" role="alert">
          {localError ?? error}
        </p>
      ) : null}
    </div>
  );
}
