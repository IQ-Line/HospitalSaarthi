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
    usePermissionsStore.getState().setCapabilityKeys(['um:user:create']);
    expect(gateAllowed({ capability: 'um:user:create' })).toBe(true);
    expect(gateAllowed({ capability: 'um:user:read' })).toBe(false);
  });

  it('any mode', () => {
    usePermissionsStore.getState().setCapabilityKeys(['um:role:read']);
    expect(gateAllowed({ any: ['um:role:read', 'um:user:create'] })).toBe(true);
    expect(gateAllowed({ any: ['um:user:create', 'um:user:update'] })).toBe(false);
  });

  it('all mode takes precedence over any', () => {
    usePermissionsStore.getState().setCapabilityKeys(['um:role:read']);
    expect(
      gateAllowed({
        all: ['um:role:read', 'um:role:assign'],
        any: ['um:role:read'],
      }),
    ).toBe(false);
  });

  it('denies when no keys configured', () => {
    usePermissionsStore.getState().setCapabilityKeys(['um:user:read']);
    expect(gateAllowed({})).toBe(false);
  });
});
