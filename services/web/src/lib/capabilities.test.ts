import { beforeEach, describe, expect, it } from 'vitest';
import { hasAllCapabilities, hasAnyCapability, hasCapability } from './capabilities';
import { usePermissionsStore } from '@/stores/permissions.store';

describe('capabilities (store-backed)', () => {
  beforeEach(() => {
    usePermissionsStore.getState().clearPermissions();
  });

  it('hasCapability checks principal keys', () => {
    usePermissionsStore.getState().setCapabilityKeys(['users:users:read']);
    expect(hasCapability('users:users:read')).toBe(true);
    expect(hasCapability('users:users:create')).toBe(false);
  });

  it('normalizes keys case-insensitively', () => {
    usePermissionsStore.getState().setCapabilityKeys(['UM:USER:READ']);
    expect(hasCapability('users:users:read')).toBe(true);
  });

  it('hasAnyCapability and hasAllCapabilities', () => {
    usePermissionsStore.getState().setCapabilityKeys(['user-roles:user-roles:read', 'user-roles:role:assign']);
    expect(hasAnyCapability(['user-roles:user-roles:read', 'users:users:create'])).toBe(true);
    expect(hasAllCapabilities(['user-roles:user-roles:read', 'user-roles:role:assign'])).toBe(true);
    expect(hasAllCapabilities(['user-roles:user-roles:read', 'users:users:create'])).toBe(false);
  });
});
