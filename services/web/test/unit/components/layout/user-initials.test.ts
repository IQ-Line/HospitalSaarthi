import { describe, expect, it } from 'vitest';
import { getUserInitials } from '../../../../src/components/layout/user-initials';

describe('getUserInitials', () => {
  it('returns ? when name is empty', () => {
    expect(getUserInitials(null)).toBe('?');
    expect(getUserInitials('   ')).toBe('?');
  });

  it('uses first and last word initials', () => {
    expect(getUserInitials('Vijay Hospital')).toBe('VH');
  });

  it('uses first two letters for a single word', () => {
    expect(getUserInitials('Admin')).toBe('AD');
  });
});
