import { describe, expect, it } from 'vitest';
import {
  formatFormNumberDisplay,
  parseFormNumberInput,
  sanitizeFormDecimalInput,
} from '@/lib/form-number-input';

describe('formatFormNumberDisplay', () => {
  it('shows empty for zero and non-numbers', () => {
    expect(formatFormNumberDisplay(0)).toBe('');
    expect(formatFormNumberDisplay(null)).toBe('');
    expect(formatFormNumberDisplay('10')).toBe('');
  });

  it('shows decimals as typed', () => {
    expect(formatFormNumberDisplay(10.5)).toBe('10.5');
    expect(formatFormNumberDisplay(109.25)).toBe('109.25');
  });
});

describe('parseFormNumberInput', () => {
  it('parses fractional amounts', () => {
    expect(parseFormNumberInput('10.5')).toBe(10.5);
    expect(parseFormNumberInput('109.25')).toBe(109.25);
  });

  it('treats empty and lone dot as zero', () => {
    expect(parseFormNumberInput('')).toBe(0);
    expect(parseFormNumberInput('.')).toBe(0);
    expect(parseFormNumberInput('   ')).toBe(0);
  });
});

describe('sanitizeFormDecimalInput', () => {
  it('allows partial decimal entry', () => {
    expect(sanitizeFormDecimalInput('12.')).toBe('12.');
    expect(sanitizeFormDecimalInput('0.')).toBe('0.');
  });

  it('caps fractional digits at two by default', () => {
    expect(sanitizeFormDecimalInput('12.345')).toBe('12.34');
    expect(sanitizeFormDecimalInput('12.3')).toBe('12.3');
  });

  it('blocks non-numeric characters', () => {
    expect(sanitizeFormDecimalInput('12a')).toBe('');
    expect(sanitizeFormDecimalInput('-5')).toBe('');
  });

  it('strips decimals when maxDecimalPlaces is zero', () => {
    expect(sanitizeFormDecimalInput('12.5', 0)).toBe('125');
    expect(sanitizeFormDecimalInput('12.', 0)).toBe('12');
  });
});
