import { describe, expect, it } from 'vitest';
import { suggestUniqueRoleCode } from '../../../../../src/features/user-management/lib/suggest-unique-role-code';

describe('suggestUniqueRoleCode', () => {
  it('prefers display-name slug when available', () => {
    expect(
      suggestUniqueRoleCode({
        roleType: 'doctor',
        displayName: 'Cardiology Doctor',
        existingCodes: [],
      }),
    ).toBe('cardiology-doctor');
  });

  it('prefixes with role type when display-name slug is taken', () => {
    expect(
      suggestUniqueRoleCode({
        roleType: 'doctor',
        displayName: 'Doctor',
        existingCodes: ['doctor'],
      }),
    ).toBe('doctor-doctor');
  });

  it('appends numeric suffix when base type slug is taken', () => {
    expect(
      suggestUniqueRoleCode({
        roleType: 'doctor',
        displayName: '',
        existingCodes: ['doctor'],
      }),
    ).toBe('doctor-2');
  });
});
