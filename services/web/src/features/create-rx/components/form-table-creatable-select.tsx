import { useEffect, useMemo, useState } from 'react';
import { CheckIcon, ChevronDownIcon } from 'lucide-react';
import { cn } from '@pulse/utils';
import {
  Popover,
  PopoverAnchor,
  PopoverContent,
} from '@pulse/ui/popover';

export interface FormTableCreatableSelectOption {
  label: string;
  value: string;
}

export interface FormTableCreatableSelectProps {
  value: string;
  onChange: (value: string) => void;
  options: FormTableCreatableSelectOption[];
  placeholder?: string;
  disabled?: boolean;
  invalid?: boolean;
}

function filterOptions(
  options: FormTableCreatableSelectOption[],
  query: string,
): FormTableCreatableSelectOption[] {
  const normalized = query.trim().toLowerCase();
  if (!normalized) return options;
  return options.filter(
    (opt) =>
      opt.label.toLowerCase().includes(normalized) ||
      opt.value.toLowerCase().includes(normalized),
  );
}

export function FormTableCreatableSelect({
  value,
  onChange,
  options,
  placeholder,
  disabled = false,
  invalid = false,
}: FormTableCreatableSelectProps) {
  const [open, setOpen] = useState(false);
  const [inputValue, setInputValue] = useState(value);

  useEffect(() => {
    setInputValue(value);
  }, [value]);

  const filteredOptions = useMemo(
    () => filterOptions(options, inputValue),
    [options, inputValue],
  );

  const pickOption = (next: string) => {
    setInputValue(next);
    onChange(next);
    setOpen(false);
  };

  const openDropdown = () => {
    if (!disabled) {
      setOpen(true);
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverAnchor asChild>
        <div
          className={cn(
            'border-input focus-within:border-ring focus-within:ring-ring/50 dark:bg-input/30 flex h-8 w-full cursor-text items-center gap-1.5 rounded-lg border bg-transparent pr-2 pl-2.5 text-sm transition-colors focus-within:ring-[3px]',
            invalid &&
              'border-red-500 ring-1 ring-red-500 focus-within:ring-red-500 aria-invalid:ring-destructive/20',
            disabled && 'cursor-not-allowed opacity-50',
          )}
          aria-invalid={invalid || undefined}
          onMouseDown={() => {
            if (!disabled) {
              setOpen(true);
            }
          }}
        >
          <input
            type="text"
            value={inputValue}
            disabled={disabled}
            placeholder={placeholder}
            onFocus={openDropdown}
            onClick={openDropdown}
            onChange={(event) => {
              const next = event.target.value;
              setInputValue(next);
              onChange(next);
              openDropdown();
            }}
            className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed"
            aria-invalid={invalid || undefined}
          />
          <button
            type="button"
            disabled={disabled}
            tabIndex={-1}
            onMouseDown={(event) => event.preventDefault()}
            onClick={openDropdown}
            className="text-muted-foreground flex shrink-0 items-center justify-center rounded-sm outline-none disabled:pointer-events-none"
            aria-label="Show catalog options"
          >
            <ChevronDownIcon className="size-4 pointer-events-none" />
          </button>
        </div>
      </PopoverAnchor>
      <PopoverContent
        align="start"
        sideOffset={4}
        className="bg-popover text-popover-foreground ring-foreground/10 z-[100] w-[var(--radix-popover-trigger-width)] max-h-72 overflow-hidden rounded-lg p-1 shadow-md ring-1"
        onOpenAutoFocus={(event) => event.preventDefault()}
      >
        <div className="max-h-64 overflow-y-auto">
          {filteredOptions.length === 0 ? (
            <p className="text-muted-foreground px-2 py-2 text-sm">No matching catalog items</p>
          ) : (
            filteredOptions.map((opt) => (
              <button
                key={opt.value}
                type="button"
                className={cn(
                  'focus:bg-accent focus:text-accent-foreground relative flex w-full cursor-default items-center rounded-md py-1 pr-8 pl-1.5 text-left text-sm outline-hidden select-none',
                  value === opt.value && 'bg-accent/50',
                )}
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => pickOption(opt.value)}
              >
                <span className="truncate">{opt.label}</span>
                {value === opt.value ? (
                  <span className="pointer-events-none absolute right-2 flex size-4 items-center justify-center">
                    <CheckIcon className="size-4" />
                  </span>
                ) : null}
              </button>
            ))
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
