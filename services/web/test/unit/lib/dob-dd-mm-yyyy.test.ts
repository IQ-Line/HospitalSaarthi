import { describe, expect, it } from 'vitest';
import {
  DOB_INVALID_MESSAGE,
  formatLocalDateToIso,
  joinDobPartsToIso,
  sanitizeDobDayInput,
  sanitizeDobMonthInput,
  sanitizeDobYearInput,
  splitIsoToDobParts,
  validateDobIso,
} from '../../../src/lib/dob-dd-mm-yyyy';

describe('sanitizeDob part inputs', () => {
  it('caps day and month at 2 digits and year at 4', () => {
    expect(sanitizeDobDayInput('159')).toBe('15');
    expect(sanitizeDobMonthInput('129')).toBe('12');
    expect(sanitizeDobYearInput('199012')).toBe('1990');
  });
});

describe('joinDobPartsToIso', () => {
  it('builds ISO from DD, MM, YYYY parts', () => {
    expect(joinDobPartsToIso('15', '1', '1990')).toBe('1990-01-15');
    expect(joinDobPartsToIso('15', '01', '1990')).toBe('1990-01-15');
    expect(joinDobPartsToIso('31', '02', '1990')).toBeNull();
    expect(joinDobPartsToIso('15', '01', '199')).toBeNull();
  });
});

describe('splitIsoToDobParts', () => {
  it('splits ISO into unpadded day/month and 4-digit year', () => {
    expect(splitIsoToDobParts('1990-01-15')).toEqual({
      day: '15',
      month: '1',
      year: '1990',
    });
  });
});

describe('validateDobIso', () => {
  it('rejects future dates', () => {
    const future = new Date();
    future.setFullYear(future.getFullYear() + 1);
    const iso = `${future.getFullYear()}-01-01`;
    expect(validateDobIso(iso)).toBe(DOB_INVALID_MESSAGE);
  });
});

describe('formatLocalDateToIso', () => {
  it('formats a local date without timezone shift', () => {
    expect(formatLocalDateToIso(new Date(1990, 0, 15))).toBe('1990-01-15');
  });
});
