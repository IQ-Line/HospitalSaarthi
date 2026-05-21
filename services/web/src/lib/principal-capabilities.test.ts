import { describe, expect, it } from 'vitest';
import {
  capabilityKeysFromPrincipalAttributes,
  normalizeCapabilityKey,
} from './principal-capabilities';

describe('principal-capabilities', () => {
  it('normalizes keys to lowercase trimmed', () => {
    expect(normalizeCapabilityKey('  UM:User:Read ')).toBe('users:users:read');
  });

  it('extracts capabilities and delegated_capabilities arrays', () => {
    const keys = capabilityKeysFromPrincipalAttributes({
      capabilities: ['users:users:read', 'UM:ROLE:READ'],
      delegated_capabilities: ['visitpad-templates:visitpad:view'],
      other: 'ignored',
    });
    expect(keys).toEqual(['user-roles:user-roles:read', 'users:users:read', 'visitpad-templates:visitpad:view']);
  });

  it('returns empty array when attributes missing', () => {
    expect(capabilityKeysFromPrincipalAttributes(undefined)).toEqual([]);
  });
});
