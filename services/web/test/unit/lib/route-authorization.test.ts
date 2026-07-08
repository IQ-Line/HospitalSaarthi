import { beforeEach, describe, expect, it, vi } from 'vitest';
import { requireCapability } from '../../../src/lib/require-capabilities';
import { UM_USER_READ } from '../../../src/lib/runtime-capability-keys';
import { guardRolesAdminRoute } from '@/features/user-management/lib/route-guards';
import { usePermissionsStore } from '@/stores/permissions.store';

const redirectMock = vi.hoisted(() =>
  vi.fn((opts: { to: string }) => ({ type: 'redirect', ...opts })),
);

vi.mock('@tanstack/react-router', () => ({
  redirect: redirectMock,
}));

/** Mirrors user-management/$userId route guard (uses the real requireCapability). */
function userDetailBeforeLoad(): void {
  requireCapability(UM_USER_READ)();
}

describe('route authorization guards', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    usePermissionsStore.getState().clearPermissions();
  });

  it('user detail route requires users:users:read', () => {
    usePermissionsStore.getState().setCapabilityKeys(['users:users:read']);
    expect(() => userDetailBeforeLoad()).not.toThrow();

    usePermissionsStore.getState().setCapabilityKeys([]);
    expect(() => userDetailBeforeLoad()).toThrow();
    expect(redirectMock).toHaveBeenCalledWith({ to: '/dashboard' });
  });

  describe('roles admin route (the REAL guardRolesAdminRoute)', () => {
    it('allows through when a roles-admin capability is present', () => {
      usePermissionsStore.getState().setCapabilityKeys(['user-roles:user-roles:read']);
      expect(() => guardRolesAdminRoute()).not.toThrow();
      expect(redirectMock).not.toHaveBeenCalled();
    });

    it('redirects to the users section when only the users section is reachable', () => {
      // No roles-admin capability, but a users-section one → /user-management, NOT /dashboard.
      // This branch was entirely absent from the previous re-implemented copy.
      usePermissionsStore.getState().setCapabilityKeys(['users:users:read']);
      expect(() => guardRolesAdminRoute()).toThrow();
      expect(redirectMock).toHaveBeenCalledWith({
        to: '/user-management',
        search: { q: '', createUser: false },
      });
    });

    it('redirects to the dashboard when neither roles-admin nor users-section is available', () => {
      usePermissionsStore.getState().setCapabilityKeys([]);
      expect(() => guardRolesAdminRoute()).toThrow();
      expect(redirectMock).toHaveBeenCalledWith({ to: '/dashboard' });
    });
  });
});
