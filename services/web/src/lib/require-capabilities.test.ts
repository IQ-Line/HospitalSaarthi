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
    usePermissionsStore.getState().setCapabilityKeys(['um:user:read']);
    const guard = requireCapability('um:user:read');
    expect(() => guard()).not.toThrow();
    expect(redirectMock).not.toHaveBeenCalled();
  });

  it('redirects to dashboard by default when check fails', () => {
    usePermissionsStore.getState().setCapabilityKeys([]);
    const guard = requireCapability('um:user:read');
    expect(() => guard()).toThrow();
    expect(redirectMock).toHaveBeenCalledWith({ to: '/dashboard' });
  });

  it('supports custom redirect target', () => {
    usePermissionsStore.getState().setCapabilityKeys([]);
    const guard = requireCapability('um:role:create', { redirectTo: '/login' });
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
    usePermissionsStore.getState().setCapabilityKeys(['um:user:read']);
    const guard = requireAnyCapability(['um:user:read', 'um:role:create']);
    expect(() => guard()).not.toThrow();
  });

  it('fails when no key matches', () => {
    usePermissionsStore.getState().setCapabilityKeys([]);
    const guard = requireAnyCapability(['um:user:read', 'um:role:create']);
    expect(() => guard()).toThrow();
  });
});

describe('requireAllCapabilities', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    usePermissionsStore.getState().clearPermissions();
  });

  it('requires every key', () => {
    usePermissionsStore.getState().setCapabilityKeys(['um:role:read', 'um:role:assign']);
    const guard = requireAllCapabilities(['um:role:read', 'um:role:assign']);
    expect(() => guard()).not.toThrow();

    const failGuard = requireAllCapabilities(['um:role:read', 'um:user:create']);
    expect(() => failGuard()).toThrow();
  });
});
