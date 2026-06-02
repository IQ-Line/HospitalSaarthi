import { describe, expect, it } from 'vitest';
import { mergePrincipalRoleCodes, principalHasAnyRole } from './principal-roles';

describe('principalHasAnyRole', () => {
  it('matches role codes case-insensitively', () => {
    expect(principalHasAnyRole(['Doctor'], ['doctor'])).toBe(true);
    expect(principalHasAnyRole(['nurse'], ['doctor'])).toBe(false);
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
