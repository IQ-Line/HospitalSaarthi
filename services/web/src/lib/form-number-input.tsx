import { forwardRef, type ComponentProps } from 'react';
import { Input } from '@pulse/ui/input';

/** Display value for controlled number fields — empty when zero so users can type afresh. */
export function formatFormNumberDisplay(value: unknown): string {
  if (typeof value !== 'number' || !Number.isFinite(value) || value === 0) {
    return '';
  }
  return String(value);
}

/** Parse `<input type="number">` text; empty clears to `fallback` (default 0). */
export function parseFormNumberInput(raw: string, fallback = 0): number {
  const trimmed = raw.trim();
  if (trimmed === '') return fallback;
  const n = Number(trimmed);
  return Number.isFinite(n) ? n : fallback;
}

type FormNumberInputProps = Omit<ComponentProps<typeof Input>, 'type' | 'value' | 'onChange'> & {
  value: number;
  onChange: (value: number) => void;
};

/** Controlled number input that does not stick on `0` while editing. */
export const FormNumberInput = forwardRef<HTMLInputElement, FormNumberInputProps>(
  function FormNumberInput({ value, onChange, onFocus, ...rest }, ref) {
    return (
      <Input
        ref={ref}
        type="number"
        {...rest}
        value={formatFormNumberDisplay(value)}
        onFocus={(e) => {
          e.target.select();
          onFocus?.(e);
        }}
        onChange={(e) => onChange(parseFormNumberInput(e.target.value))}
      />
    );
  },
);
