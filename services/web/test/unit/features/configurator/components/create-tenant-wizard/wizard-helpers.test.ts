import { describe, expect, it } from 'vitest';
import type { Module } from '@/features/master-data/types';
import {
  applyModuleToggle,
  buildChildrenMap,
  collectDescendantModuleIds,
  defaultEnabledModuleIds,
  moduleSubtreeSelectionState,
  setModuleSubtreeSelection,
} from '../../../../../../src/features/configurator/components/create-tenant-wizard/wizard-helpers';

const modules: Module[] = [
  {
    id: 'm-md',
    parent_id: null,
    name: 'Master Data',
    slug: 'master-data',
    description: null,
    category: 'core',
    version: '1.0.0',
    level: 1,
    icon: null,
    is_active: true,
    is_deleted: false,
    created_by: null,
    updated_by: null,
    created_at: '',
    updated_at: '',
  },
  {
    id: 'm-um',
    parent_id: null,
    name: 'User Management',
    slug: 'user-management',
    description: null,
    category: 'core',
    version: '1.0.0',
    level: 1,
    icon: null,
    is_active: true,
    is_deleted: false,
    created_by: null,
    updated_by: null,
    created_at: '',
    updated_at: '',
  },
  {
    id: 'm-users',
    parent_id: 'm-um',
    name: 'Users',
    slug: 'users',
    description: null,
    category: 'core',
    version: '1.0.0',
    level: 2,
    icon: null,
    is_active: true,
    is_deleted: false,
    created_by: null,
    updated_by: null,
    created_at: '',
    updated_at: '',
  },
  {
    id: 'm-roles',
    parent_id: 'm-um',
    name: 'User Roles',
    slug: 'user-roles',
    description: null,
    category: 'core',
    version: '1.0.0',
    level: 2,
    icon: null,
    is_active: true,
    is_deleted: false,
    created_by: null,
    updated_by: null,
    created_at: '',
    updated_at: '',
  },
];

describe('wizard module tree selection', () => {
  const childMap = buildChildrenMap(modules);

  it('collectDescendantModuleIds returns all nested children', () => {
    expect(collectDescendantModuleIds('m-um', childMap).sort()).toEqual(['m-roles', 'm-users']);
  });

  it('applyModuleToggle selects parent and all descendants', () => {
    const next = applyModuleToggle('m-um', new Set(), childMap);
    expect([...next].sort()).toEqual(['m-roles', 'm-um', 'm-users']);
  });

  it('applyModuleToggle deselects parent and all descendants', () => {
    const selected = new Set(['m-um', 'm-users', 'm-roles', 'm-md']);
    const next = applyModuleToggle('m-um', selected, childMap);
    expect([...next]).toEqual(['m-md']);
  });

  it('defaultEnabledModuleIds pre-selects roots and full subtrees', () => {
    expect([...defaultEnabledModuleIds(modules, childMap)].sort()).toEqual([
      'm-md',
      'm-roles',
      'm-um',
      'm-users',
    ]);
  });

  it('setModuleSubtreeSelection selects every descendant for accordion select-all', () => {
    const next = setModuleSubtreeSelection('m-um', new Set(['m-md']), childMap, true);
    expect([...next].sort()).toEqual(['m-md', 'm-roles', 'm-um', 'm-users']);
  });

  it('moduleSubtreeSelectionState reports partial selection', () => {
    const state = moduleSubtreeSelectionState('m-um', new Set(['m-users']), childMap);
    expect(state.someSelected).toBe(true);
    expect(state.allSelected).toBe(false);
  });
});
