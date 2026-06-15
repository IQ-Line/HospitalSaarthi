import { describe, expect, it } from 'vitest';
import { resolvePatientAbhaNumber } from './registration-snapshot';

describe('resolvePatientAbhaNumber', () => {
  it('prefers EMPI value over registration snapshot', () => {
    expect(
      resolvePatientAbhaNumber('91-1111-1111-1111', { abhaNumber: '91-2222-2222-2222' } as never),
    ).toBe('91-1111-1111-1111');
  });

  it('falls back to registration snapshot when EMPI is empty', () => {
    expect(
      resolvePatientAbhaNumber(null, { abhaNumber: '91-5682-4304-3771' } as never),
    ).toBe('91-5682-4304-3771');
  });

  it('returns NA when neither source has ABHA', () => {
    expect(resolvePatientAbhaNumber(null, null)).toBe('NA');
  });
});
