import { describe, expect, it } from 'vitest';
import {
  capabilityKeysFromPrincipalAttributes,
  normalizeCapabilityKey,
} from '../../../src/lib/principal-capabilities';

describe('principal-capabilities', () => {
  it('normalizes keys to lowercase trimmed', () => {
    expect(normalizeCapabilityKey('  Users:Users:Read ')).toBe('users:users:read');
  });

  it('extracts capabilities and delegated_capabilities arrays', () => {
    const keys = capabilityKeysFromPrincipalAttributes({
      capabilities: ['users:users:read', 'USER-ROLES:User-Roles:READ'],
      delegated_capabilities: ['visitpad-master:visitpad:view'],
      other: 'ignored',
    });
    expect(keys).toEqual(['user-roles:user-roles:read', 'users:users:read', 'visitpad-master:visitpad:view']);
  });

  it('returns empty array when attributes missing', () => {
    expect(capabilityKeysFromPrincipalAttributes(undefined)).toEqual([]);
  });
});
