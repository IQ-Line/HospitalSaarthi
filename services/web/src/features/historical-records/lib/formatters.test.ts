import { describe, expect, it } from 'vitest';
import { isWithinDateRange, normalizeAbhaForSearch } from './formatters';

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
