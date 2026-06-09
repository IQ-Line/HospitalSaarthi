import { describe, expect, it } from 'vitest';
import { consentStatusLabel, toConsentDateRangeIso } from '@/features/abha/lib/m3-consent';

describe('toConsentDateRangeIso', () => {
  it('maps date inputs to ISO window', () => {
    expect(toConsentDateRangeIso('2026-01-01', '2026-06-01')).toEqual({
      from: '2026-01-01T00:00:00.000Z',
      to: '2026-06-01T23:59:59.999Z',
    });
  });
});

describe('consentStatusLabel', () => {
  it('maps known FSM states', () => {
    expect(consentStatusLabel('AWAITING_PATIENT_APPROVAL')).toBe('Awaiting patient approval');
    expect(consentStatusLabel('CONSENT_GRANTED')).toBe('Granted');
  });
});
