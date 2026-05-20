import { beforeEach, describe, expect, it, vi } from 'vitest';
import { requireAnyCapability, requireCapability } from './require-capabilities';
import { UM_ROLES_ADMIN_ANY, UM_USER_READ } from './runtime-capability-keys';
import { usePermissionsStore } from '@/stores/permissions.store';

const redirectMock = vi.hoisted(() => vi.fn((opts: { to: string }) => ({ type: 'redirect', ...opts })));

vi.mock('@tanstack/react-router', () => ({
  redirect: redirectMock,
}));

/** Mirrors user-management/$userId route guard. */
function userDetailBeforeLoad(): void {
  requireCapability(UM_USER_READ)();
}

/** Mirrors user-management/roles redirect when only users section is available. */
function rolesBeforeLoad(): void {
  const p = usePermissionsStore.getState();
  if (!p.hasAnyCapability(UM_ROLES_ADMIN_ANY)) {
    throw redirectMock({ to: '/dashboard' });
  }
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

  it('roles admin route requires any roles admin capability', () => {
    usePermissionsStore.getState().setCapabilityKeys(['user-roles:user-roles:read']);
    expect(() => rolesBeforeLoad()).not.toThrow();

    usePermissionsStore.getState().setCapabilityKeys(['users:users:read']);
    expect(() => rolesBeforeLoad()).toThrow();
  });
});
