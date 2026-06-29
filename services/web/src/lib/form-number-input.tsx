import {
  forwardRef,
  useState,
  type ChangeEvent,
  type ComponentProps,
  type FocusEvent,
} from 'react';
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
  if (trimmed === '' || trimmed === '.') return fallback;
  const n = Number(trimmed);
  return Number.isFinite(n) ? n : fallback;
}

const PARTIAL_DECIMAL_RE = /^\d*\.?\d*$/;

/** Keep only digits and at most one decimal point, capped at `maxDecimalPlaces` (0 = integers only). */
export function sanitizeFormDecimalInput(raw: string, maxDecimalPlaces = 2): string {
  if (raw === '') return raw;
  if (!PARTIAL_DECIMAL_RE.test(raw)) return '';

  if (maxDecimalPlaces === 0) {
    return raw.replace(/\./g, '');
  }

  const dot = raw.indexOf('.');
  if (dot === -1) return raw;

  const whole = raw.slice(0, dot);
  const fraction = raw.slice(dot + 1, dot + 1 + maxDecimalPlaces);
  return `${whole}.${fraction}`;
}

type FormNumberInputProps = Omit<ComponentProps<typeof Input>, 'type' | 'value' | 'onChange'> & {
  value: number;
  onChange: (value: number) => void;
  /** Max fractional digits while typing; 0 = integers only. Default 2 (paise). */
  maxDecimalPlaces?: number;
};

/** Controlled number input that does not stick on `0` while editing and preserves mid-typing decimals (e.g. `12.`). */
export const FormNumberInput = forwardRef<HTMLInputElement, FormNumberInputProps>(
  function FormNumberInput(
    { value, onChange, onFocus, onBlur, maxDecimalPlaces = 2, step = 'any', ...rest },
    ref,
  ) {
    const [draft, setDraft] = useState<string | null>(null);
    const displayValue = draft ?? formatFormNumberDisplay(value);

    const commitDraft = (raw: string) => {
      const trimmed = raw.trim();
      if (trimmed === '' || trimmed === '.') {
        onChange(0);
        return;
      }
      if (trimmed.endsWith('.')) return;
      onChange(parseFormNumberInput(trimmed));
    };

    return (
      <Input
        ref={ref}
        type="number"
        step={step}
        inputMode="decimal"
        {...rest}
        value={displayValue}
        onFocus={(e) => {
          setDraft(formatFormNumberDisplay(value));
          e.target.select();
          onFocus?.(e);
        }}
        onChange={(e: ChangeEvent<HTMLInputElement>) => {
          const sanitized = sanitizeFormDecimalInput(e.target.value, maxDecimalPlaces);
          if (sanitized === '' && e.target.value !== '') return;
          setDraft(sanitized);
          commitDraft(sanitized);
        }}
        onBlur={(e: FocusEvent<HTMLInputElement>) => {
          const final = parseFormNumberInput(draft ?? e.target.value);
          setDraft(null);
          onChange(final);
          onBlur?.(e);
        }}
      />
    );
  },
);
