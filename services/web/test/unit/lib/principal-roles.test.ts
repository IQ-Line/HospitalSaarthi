import { describe, expect, it } from 'vitest';
import {
  formatPrincipalRoleLabels,
  formatRoleCodeLabel,
  mergePrincipalRoleCodes,
  principalHasAnyRole,
} from '../../../src/lib/principal-roles';

describe('principalHasAnyRole', () => {
  it('matches role codes case-insensitively', () => {
    expect(principalHasAnyRole(['Doctor'], ['doctor'])).toBe(true);
    expect(principalHasAnyRole(['nurse'], ['doctor'])).toBe(false);
  });
});

describe('formatRoleCodeLabel', () => {
  it('title-cases kebab and snake role codes', () => {
    expect(formatRoleCodeLabel('receptionist')).toBe('Receptionist');
    expect(formatRoleCodeLabel('super-admin')).toBe('Super Admin');
    expect(formatRoleCodeLabel('lab_technician')).toBe('Lab Technician');
  });
});

describe('formatPrincipalRoleLabels', () => {
  it('merges and formats roles for display', () => {
    expect(formatPrincipalRoleLabels(['receptionist'], ['doctor'])).toBe(
      'Receptionist, Doctor',
    );
  });
});

describe('mergePrincipalRoleCodes', () => {
  it('deduplicates JWT and permissions-store roles', () => {
    expect(mergePrincipalRoleCodes(['Doctor'], ['doctor', 'nurse'])).toEqual([
      'doctor',
      'nurse',
    ]);
  });
});
