import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  requireAllCapabilities,
  requireAnyCapability,
  requireCapability,
} from './require-capabilities';
import { usePermissionsStore } from '@/stores/permissions.store';

const redirectMock = vi.hoisted(() => vi.fn((opts: { to: string }) => ({ type: 'redirect', ...opts })));

vi.mock('@tanstack/react-router', () => ({
  redirect: redirectMock,
}));

describe('requireCapability', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    usePermissionsStore.getState().clearPermissions();
  });

  it('allows navigation when capability is held', () => {
    usePermissionsStore.getState().setCapabilityKeys(['users:users:read']);
    const guard = requireCapability('users:users:read');
    expect(() => guard()).not.toThrow();
    expect(redirectMock).not.toHaveBeenCalled();
  });

  it('redirects to dashboard by default when check fails', () => {
    usePermissionsStore.getState().setCapabilityKeys([]);
    const guard = requireCapability('users:users:read');
    expect(() => guard()).toThrow();
    expect(redirectMock).toHaveBeenCalledWith({ to: '/dashboard' });
  });

  it('supports custom redirect target', () => {
    usePermissionsStore.getState().setCapabilityKeys([]);
    const guard = requireCapability('user-roles:user-roles:create', { redirectTo: '/login' });
    expect(() => guard()).toThrow();
    expect(redirectMock).toHaveBeenCalledWith({ to: '/login' });
  });
});

describe('requireAnyCapability', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    usePermissionsStore.getState().clearPermissions();
  });

  it('passes when any key matches', () => {
    usePermissionsStore.getState().setCapabilityKeys(['users:users:read']);
    const guard = requireAnyCapability(['users:users:read', 'user-roles:user-roles:create']);
    expect(() => guard()).not.toThrow();
  });

  it('fails when no key matches', () => {
    usePermissionsStore.getState().setCapabilityKeys([]);
    const guard = requireAnyCapability(['users:users:read', 'user-roles:user-roles:create']);
    expect(() => guard()).toThrow();
  });
});

describe('requireAllCapabilities', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    usePermissionsStore.getState().clearPermissions();
  });

  it('requires every key', () => {
    usePermissionsStore.getState().setCapabilityKeys(['user-roles:user-roles:read', 'user-roles:role:assign']);
    const guard = requireAllCapabilities(['user-roles:user-roles:read', 'user-roles:role:assign']);
    expect(() => guard()).not.toThrow();

    const failGuard = requireAllCapabilities(['user-roles:user-roles:read', 'users:users:create']);
    expect(() => failGuard()).toThrow();
  });
});
