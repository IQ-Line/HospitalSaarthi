import { describe, expect, it } from 'vitest';
import {
  capabilityKeysFromPrincipalAttributes,
  normalizeCapabilityKey,
} from './principal-capabilities';

describe('principal-capabilities', () => {
  it('normalizes keys to lowercase trimmed', () => {
    expect(normalizeCapabilityKey('  UM:User:Read ')).toBe('um:user:read');
  });

  it('extracts capabilities and delegated_capabilities arrays', () => {
    const keys = capabilityKeysFromPrincipalAttributes({
      capabilities: ['um:user:read', 'UM:ROLE:READ'],
      delegated_capabilities: ['md:visitpad:view'],
      other: 'ignored',
    });
    expect(keys).toEqual(['md:visitpad:view', 'um:role:read', 'um:user:read']);
  });

  it('returns empty array when attributes missing', () => {
    expect(capabilityKeysFromPrincipalAttributes(undefined)).toEqual([]);
  });
});
