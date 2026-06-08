import { useState } from 'react';
import { CalendarIcon, X } from 'lucide-react';
import type { DateRange } from 'react-day-picker';
import { cn } from '@pulse/utils';
import { Button } from '@pulse/ui/button';
import { Calendar } from '@pulse/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@pulse/ui/popover';
import {
  formatQueuedDateRangeLabel,
  hasQueuedDateRange,
  pickerRangeToQueuedDates,
  queuedDatesToPickerRange,
} from '../lib/pharmacy-queue-date-range';
import type { PharmacyQueueDateRange } from '../types';

type PharmacyQueueDateRangePickerProps = {
  value: PharmacyQueueDateRange;
  onChange: (value: PharmacyQueueDateRange) => void;
};

function rangeHint(range: DateRange | undefined): string {
  if (range?.from && range?.to) return 'Range selected';
  if (range?.from) return 'Choose end date';
  return 'Choose start date';
}

export function PharmacyQueueDateRangePicker({
  value,
  onChange,
}: PharmacyQueueDateRangePickerProps) {
  const [open, setOpen] = useState(false);
  const [draftRange, setDraftRange] = useState<DateRange | undefined>();
  const committedRange = queuedDatesToPickerRange(value);
  const label = formatQueuedDateRangeLabel(value);
  const active = hasQueuedDateRange(value);

  const handleOpenChange = (nextOpen: boolean) => {
    if (nextOpen) {
      setDraftRange(committedRange);
    } else {
      setDraftRange(undefined);
    }
    setOpen(nextOpen);
  };

  const handleSelect = (range: DateRange | undefined) => {
    setDraftRange(range);
    if (range?.from && range?.to) {
      onChange(pickerRangeToQueuedDates(range));
      setOpen(false);
    }
  };

  const handleClear = () => {
    onChange({ queued_from: '', queued_to: '' });
    setDraftRange(undefined);
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          className={cn(
            'w-full justify-start gap-2 bg-muted/30 font-normal sm:w-[260px]',
            !active && 'text-muted-foreground',
          )}
        >
          <CalendarIcon className="size-4 shrink-0" />
          <span className="truncate">{label}</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-auto p-0"
        align="start"
        onOpenAutoFocus={(event) => event.preventDefault()}
      >
        <div className="border-b border-border px-3 py-2 text-xs text-muted-foreground">
          {rangeHint(draftRange)}
        </div>
        <Calendar
          mode="range"
          selected={draftRange}
          onSelect={handleSelect}
          numberOfMonths={1}
          defaultMonth={draftRange?.from ?? draftRange?.to ?? committedRange?.from ?? new Date()}
        />
        {active ? (
          <div className="border-t border-border p-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="w-full justify-center gap-2"
              onClick={handleClear}
            >
              <X className="size-4" />
              Clear dates
            </Button>
          </div>
        ) : null}
      </PopoverContent>
    </Popover>
  );
}
