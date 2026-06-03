import { beforeEach, describe, expect, it } from 'vitest';
import { useAuthStore } from '@/stores/auth.store';
import { usePermissionsStore } from '@/stores/permissions.store';
import { resolveNavigationCapabilityBypass } from './resolve-nav-bypass';

describe('resolveNavigationCapabilityBypass', () => {
  beforeEach(() => {
    useAuthStore.setState({ roles: [] });
    usePermissionsStore.getState().clearPermissions();
  });

  it('returns true for platform super-admin', () => {
    useAuthStore.setState({ roles: ['super-admin'] });
    expect(resolveNavigationCapabilityBypass()).toBe(true);
  });

  it('returns false for tenant-admin', () => {
    useAuthStore.setState({ roles: ['tenant-admin'] });
    expect(resolveNavigationCapabilityBypass()).toBe(false);
  });
});
