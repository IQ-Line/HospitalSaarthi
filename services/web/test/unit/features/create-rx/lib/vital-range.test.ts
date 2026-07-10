import { describe, expect, it } from 'vitest';
import {
  formatVitalRangeLabel,
  isVitalValueOutOfRange,
  parseVitalNumericRange,
  resolveVitalNormalRange,
} from '../../../../../src/features/create-rx/lib/vital-range';
import type { VisitpadVital } from '@/features/visitpad/types';

function vital(
  partial: Partial<VisitpadVital> & Pick<VisitpadVital, 'code' | 'name'>,
): VisitpadVital {
  return {
    id: '1',
    iq_tenant_id: null,
    short_name: partial.code,
    category: 'vital_signs',
    data_type: 'numeric',
    unit: '',
    default_unit_code: '',
    display_order: 0,
    is_active: true,
    is_deleted: false,
    created_at: '2026-01-01',
    updated_at: '2026-01-01',
    ...partial,
  };
}

describe('parseVitalNumericRange', () => {
  it('returns null for empty or missing bounds', () => {
    expect(parseVitalNumericRange(undefined)).toBeNull();
    expect(parseVitalNumericRange({})).toBeNull();
  });

  it('parses min and max', () => {
    expect(parseVitalNumericRange({ min: 90, max: 120 })).toEqual({ min: 90, max: 120 });
  });
});

describe('resolveVitalNormalRange', () => {
  it('prefers adult range for adult patients', () => {
    const row = vital({
      code: 'pulse',
      name: 'Pulse',
      normal_range_adult: { min: 60, max: 100 },
      normal_range_paediatric: { min: 70, max: 110 },
    });
    expect(resolveVitalNormalRange(row, 27)).toEqual({ min: 60, max: 100 });
  });

  it('prefers paediatric range for children', () => {
    const row = vital({
      code: 'pulse',
      name: 'Pulse',
      normal_range_adult: { min: 60, max: 100 },
      normal_range_paediatric: { min: 70, max: 110 },
    });
    expect(resolveVitalNormalRange(row, 10)).toEqual({ min: 70, max: 110 });
  });
});

describe('formatVitalRangeLabel', () => {
  it('formats bounded and one-sided ranges', () => {
    expect(formatVitalRangeLabel({ min: 90, max: 120 })).toBe('90–120');
    expect(formatVitalRangeLabel({ min: 70, max: null })).toBe('≥ 70');
    expect(formatVitalRangeLabel({ min: null, max: 135 })).toBe('≤ 135');
  });
});

describe('isVitalValueOutOfRange', () => {
  const range = { min: 90, max: 120 };

  it('flags values below min or above max', () => {
    expect(isVitalValueOutOfRange('89', range)).toBe(true);
    expect(isVitalValueOutOfRange('121', range)).toBe(true);
    expect(isVitalValueOutOfRange('100', range)).toBe(false);
  });

  it('ignores empty and non-numeric input', () => {
    expect(isVitalValueOutOfRange('', range)).toBe(false);
    expect(isVitalValueOutOfRange('n/a', range)).toBe(false);
  });
});
