import { describe, expect, it } from 'vitest';
import { isHistoricalSearchQueryValid, isWithinDateRange, normalizeAbhaForSearch, normalizeIndianPhoneForSearch } from '../../../../../src/features/historical-records/lib/formatters';

describe('normalizeIndianPhoneForSearch', () => {
  it('normalizes 10-digit mobile to +91 canonical format', () => {
    expect(normalizeIndianPhoneForSearch('8527020272')).toBe('+918527020272');
    expect(normalizeIndianPhoneForSearch('+91 8527020272')).toBe('+918527020272');
    expect(normalizeIndianPhoneForSearch('918527020272')).toBe('+918527020272');
  });

  it('returns null for incomplete numbers and non-mobile lengths', () => {
    expect(normalizeIndianPhoneForSearch('852702')).toBeNull();
    expect(normalizeIndianPhoneForSearch('260605000010000001')).toBeNull();
  });
});

describe('isHistoricalSearchQueryValid', () => {
  it('accepts only query shapes that match the selected field', () => {
    expect(isHistoricalSearchQueryValid('patient_name', 'Shanti')).toBe(true);
    expect(isHistoricalSearchQueryValid('patient_name', '8527020272')).toBe(false);

    expect(isHistoricalSearchQueryValid('mobile_number', '7838281800')).toBe(true);
    expect(isHistoricalSearchQueryValid('mobile_number', '260605000010000001')).toBe(false);

    expect(isHistoricalSearchQueryValid('abha_number', '91568243043771')).toBe(true);
    expect(isHistoricalSearchQueryValid('abha_number', '7838281800')).toBe(false);

    expect(isHistoricalSearchQueryValid('abha_address', 'user@sbx')).toBe(true);
    expect(isHistoricalSearchQueryValid('abha_address', '+917838281800')).toBe(false);

    expect(isHistoricalSearchQueryValid('uhid', '260605000010000001')).toBe(true);
    expect(isHistoricalSearchQueryValid('uhid', '7838281800')).toBe(false);
  });
});

describe('normalizeAbhaForSearch', () => {
  it('formats 14-digit ABHA with dashes for EMPI exact match', () => {
    expect(normalizeAbhaForSearch('91568243043771')).toBe('91-5682-4304-3771');
    expect(normalizeAbhaForSearch('91-5682-4304-3771')).toBe('91-5682-4304-3771');
  });

  it('returns trimmed input when not 14 digits', () => {
    expect(normalizeAbhaForSearch(' 91-1 ')).toBe('91-1');
  });
});

describe('isWithinDateRange', () => {
  it('includes dates on inclusive boundaries', () => {
    expect(isWithinDateRange('2026-06-01T10:00:00Z', '2026-06-01', '2026-06-12')).toBe(true);
    expect(isWithinDateRange('2026-06-12T23:59:00Z', '2026-06-01', '2026-06-12')).toBe(true);
    expect(isWithinDateRange('2026-05-31T23:59:00Z', '2026-06-01', '2026-06-12')).toBe(false);
    expect(isWithinDateRange('2026-06-13T00:00:00Z', '2026-06-01', '2026-06-12')).toBe(false);
  });
});
