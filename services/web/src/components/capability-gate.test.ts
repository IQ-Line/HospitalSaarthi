import { describe, expect, it } from 'vitest';
import { hasAllCapabilities, hasAnyCapability, hasCapability } from '@/lib/capabilities';
import { usePermissionsStore } from '@/stores/permissions.store';

/** Mirrors CapabilityGate resolution order (all → any → single). */
function gateAllowed(input: {
  capability?: string;
  any?: readonly string[];
  all?: readonly string[];
}): boolean {
  if (input.all && input.all.length > 0) {
    return hasAllCapabilities(input.all);
  }
  if (input.any && input.any.length > 0) {
    return hasAnyCapability(input.any);
  }
  if (input.capability) {
    return hasCapability(input.capability);
  }
  return false;
}

describe('CapabilityGate resolution', () => {
  it('single capability mode', () => {
    usePermissionsStore.getState().setCapabilityKeys(['users:users:create']);
    expect(gateAllowed({ capability: 'users:users:create' })).toBe(true);
    expect(gateAllowed({ capability: 'users:users:read' })).toBe(false);
  });

  it('any mode', () => {
    usePermissionsStore.getState().setCapabilityKeys(['user-roles:user-roles:read']);
    expect(gateAllowed({ any: ['user-roles:user-roles:read', 'users:users:create'] })).toBe(true);
    expect(gateAllowed({ any: ['users:users:create', 'users:users:update'] })).toBe(false);
  });

  it('all mode takes precedence over any', () => {
    usePermissionsStore.getState().setCapabilityKeys(['user-roles:user-roles:read']);
    expect(
      gateAllowed({
        all: ['user-roles:user-roles:read', 'user-roles:role:assign'],
        any: ['user-roles:user-roles:read'],
      }),
    ).toBe(false);
  });

  it('denies when no keys configured', () => {
    usePermissionsStore.getState().setCapabilityKeys(['users:users:read']);
    expect(gateAllowed({})).toBe(false);
  });
});
