import { describe, expect, it } from 'vitest';
import type { UmRole } from '../../../../../src/features/user-management/types';
import { isDoctorRole } from '../../../../../src/features/user-management/lib/is-doctor-role';

const baseRole: UmRole = {
  id: 'r1',
  code: 'doctor-cardiology',
  role_type: 'doctor',
  display_name: 'Cardiology',
  is_system: false,
  status: 'active',
};

describe('isDoctorRole', () => {
  it('matches role_type doctor', () => {
    expect(isDoctorRole('r1', [baseRole])).toBe(true);
  });

  it('matches legacy code doctor', () => {
    expect(
      isDoctorRole('r2', [
        {
          ...baseRole,
          id: 'r2',
          code: 'doctor',
          role_type: 'doctor',
        },
      ]),
    ).toBe(true);
  });

  it('returns false for non-doctor roles', () => {
    expect(
      isDoctorRole('r3', [
        {
          ...baseRole,
          id: 'r3',
          code: 'nurse-er',
          role_type: 'nurse',
        },
      ]),
    ).toBe(false);
  });
});
