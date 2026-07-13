import { describe, expect, it } from 'vitest';
import { buildDispensePatientSearchParams } from './search-dispense-patients';

describe('buildDispensePatientSearchParams', () => {
  it('returns null for empty or short name', () => {
    expect(buildDispensePatientSearchParams('')).toBeNull();
    expect(buildDispensePatientSearchParams('A')).toBeNull();
  });

  it('searches by name', () => {
    const params = buildDispensePatientSearchParams('Yashi');
    expect(params?.get('name')).toBe('Yashi');
    expect(params?.get('uhid')).toBeNull();
  });

  it('searches by UHID when query is long numeric', () => {
    const uhid = '260605000010000001';
    const params = buildDispensePatientSearchParams(uhid);
    expect(params?.get('uhid')).toBe(uhid);
  });

  it('searches by phone for 10-digit mobile', () => {
    const params = buildDispensePatientSearchParams('9810100001');
    expect(params?.get('phone')).toBe('+919810100001');
  });
});
