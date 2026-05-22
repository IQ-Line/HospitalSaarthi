import { describe, expect, it } from 'vitest';
import { capabilityKeysGrantProductAccess } from './module-product-access';
import type { ModuleCatalogIndex } from '@/platform/modules/types';

const catalogIndex: ModuleCatalogIndex = {
  byId: new Map(),
  bySlug: new Map([
    [
      'user-management',
      {
        id: 'l1-um',
        slug: 'user-management',
        name: 'User Management',
        icon: null,
        category: 'core',
        is_active: true,
        level: 1,
        parent_id: null,
      },
    ],
    [
      'users',
      {
        id: 'l2-users',
        slug: 'users',
        name: 'Users',
        icon: null,
        category: 'core',
        is_active: true,
        level: 2,
        parent_id: 'l1-um',
      },
    ],
    [
      'visitpad-master',
      {
        id: 'l1-vp',
        slug: 'visitpad-master',
        name: 'Visitpad',
        icon: null,
        category: 'clinical',
        is_active: true,
        level: 1,
        parent_id: null,
      },
    ],
  ]),
};

describe('capabilityKeysGrantProductAccess', () => {
  it('grants User Management when principal has L2 users:* keys only', () => {
    const keys = new Set(['users:users:read', 'users:users:create']);
    expect(
      capabilityKeysGrantProductAccess(keys, ['user-management'], catalogIndex),
    ).toBe(true);
  });

  it('does not grant Master Data when principal only has users:* keys', () => {
    const keys = new Set(['users:users:read']);
    expect(capabilityKeysGrantProductAccess(keys, ['master-data'], catalogIndex)).toBe(false);
  });

  it('canonicalizes legacy um:* keys for user-management', () => {
    const keys = new Set(['um:user:read']);
    expect(
      capabilityKeysGrantProductAccess(keys, ['user-management'], catalogIndex),
    ).toBe(true);
  });

  it('grants visitpad-master for visitpad:view shell key without L2 keys', () => {
    const keys = new Set(['visitpad-master:visitpad:view']);
    expect(
      capabilityKeysGrantProductAccess(keys, ['visitpad-master'], catalogIndex),
    ).toBe(true);
  });
});
