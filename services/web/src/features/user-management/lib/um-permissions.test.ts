import { describe, expect, it } from 'vitest';
import type { PermissionsState } from '@/stores/permissions.store';
import {
  canAccessRolesAdmin,
  canCreateRoles,
  canDeleteRoles,
  canReadRoleCapabilities,
  canReadRoles,
  canReadUsers,
  canUpdateRoles,
  canViewUserRoleAccess,
  UM_MODULE,
} from './um-permissions';

function stateWithUm(
  um: Record<string, Record<string, boolean>>,
): Pick<PermissionsState, 'map' | 'hasFeaturePermission'> {
  const map = { [UM_MODULE]: um };
  return {
    map,
    hasFeaturePermission: (module, feature, action) => map[module]?.[feature]?.[action] === true,
  };
}

describe('role mutation permissions', () => {
  it('honours granular create from Cerbos-backed map', () => {
    const s = stateWithUm({
      roles: {
        read: true,
        create: true,
        update: false,
        delete: false,
        write: true,
      },
    });
    expect(canCreateRoles(s)).toBe(true);
    expect(canUpdateRoles(s)).toBe(false);
    expect(canDeleteRoles(s)).toBe(false);
    expect(canAccessRolesAdmin(s)).toBe(true);
  });

  it('does not infer role admin from coarse roles.write alone', () => {
    const s = stateWithUm({
      roles: { write: true },
    });
    expect(canCreateRoles(s)).toBe(false);
    expect(canUpdateRoles(s)).toBe(false);
    expect(canDeleteRoles(s)).toBe(false);
    expect(canReadRoles(s)).toBe(false);
    expect(canAccessRolesAdmin(s)).toBe(false);
  });

  it('allows delete when update is granted (Cerbos role.delete uses um:role:update)', () => {
    const s = stateWithUm({
      roles: {
        read: true,
        create: false,
        update: true,
        delete: false,
        write: true,
      },
    });
    expect(canDeleteRoles(s)).toBe(true);
    expect(canCreateRoles(s)).toBe(false);
  });

  it('hides per-user role access for users.read only', () => {
    const s = stateWithUm({
      users: { read: true, write: false },
      roles: { read: false, create: false, update: false, delete: false, write: false },
      userAccess: { read: false, write: false },
    });
    expect(canReadUsers(s)).toBe(true);
    expect(canViewUserRoleAccess(s)).toBe(false);
    expect(canAccessRolesAdmin(s)).toBe(false);
  });

  it('shows per-user role access when userAccess.read is allowed', () => {
    const s = stateWithUm({
      users: { read: false, write: false },
      roles: { read: true, create: false, update: false, delete: false, write: false },
      userAccess: { read: true, write: false },
    });
    expect(canViewUserRoleAccess(s)).toBe(true);
  });

  it('loads role capability lists with role.read only (assign flow)', () => {
    const s = stateWithUm({
      roles: {
        read: true,
        create: false,
        update: false,
        delete: false,
        write: false,
      },
    });
    expect(canReadRoleCapabilities(s)).toBe(true);
    expect(canCreateRoles(s)).toBe(false);
  });
});
