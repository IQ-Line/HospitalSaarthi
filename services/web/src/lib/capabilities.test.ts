import { beforeEach, describe, expect, it } from 'vitest';
import { hasAllCapabilities, hasAnyCapability, hasCapability } from './capabilities';
import { usePermissionsStore } from '@/stores/permissions.store';

describe('capabilities (store-backed)', () => {
  beforeEach(() => {
    usePermissionsStore.getState().clearPermissions();
  });

  it('hasCapability checks principal keys', () => {
    usePermissionsStore.getState().setCapabilityKeys(['um:user:read']);
    expect(hasCapability('um:user:read')).toBe(true);
    expect(hasCapability('um:user:create')).toBe(false);
  });

  it('normalizes keys case-insensitively', () => {
    usePermissionsStore.getState().setCapabilityKeys(['UM:USER:READ']);
    expect(hasCapability('um:user:read')).toBe(true);
  });

  it('hasAnyCapability and hasAllCapabilities', () => {
    usePermissionsStore.getState().setCapabilityKeys(['um:role:read', 'um:role:assign']);
    expect(hasAnyCapability(['um:role:read', 'um:user:create'])).toBe(true);
    expect(hasAllCapabilities(['um:role:read', 'um:role:assign'])).toBe(true);
    expect(hasAllCapabilities(['um:role:read', 'um:user:create'])).toBe(false);
  });
});
