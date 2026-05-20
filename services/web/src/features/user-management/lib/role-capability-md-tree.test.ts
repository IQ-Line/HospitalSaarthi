import { describe, expect, it } from 'vitest';
import type { Module } from '@/features/master-data/types';
import type { Capability } from '../types';
import {
  capabilitiesToMasterDataPermissionOptions,
  enabledModuleIdsForRoleCapabilities,
} from './role-capability-md-tree';

function module(
  id: string,
  parentId: string | null,
  level: number,
  slug: string,
  name: string,
): Module {
  return {
    id,
    parent_id: parentId,
    name,
    slug,
    description: null,
    category: 'core',
    version: '1.0.0',
    level,
    icon: null,
    is_active: true,
    is_deleted: false,
    created_by: null,
    updated_by: null,
    created_at: '',
    updated_at: '',
  };
}

function capability(
  id: string,
  sourceModuleSlug: string,
  key: string,
): Capability {
  return {
    id,
    capability_key: key,
    module: sourceModuleSlug,
    feature: sourceModuleSlug,
    action: 'read',
    display_name: 'Read',
    description: null,
    is_active: true,
    source_catalog: 'master_data',
    source_module_slug: sourceModuleSlug,
    source_permission_slug: 'read',
  };
}

describe('role-capability-md-tree', () => {
  it('includes L1–L3 ancestors for a capability on an L3 module', () => {
    const modules = [
      module('l1', null, 1, 'user-management', 'User Management'),
      module('l2', 'l1', 2, 'users', 'Users'),
      module('l3', 'l2', 3, 'users', 'Users'),
      module('l4', 'l3', 4, 'users-detail', 'Users detail'),
    ];
    const caps = [capability('cap-1', 'users', 'users:users:read')];

    const enabled = enabledModuleIdsForRoleCapabilities(modules, caps);
    expect(enabled.has('l1')).toBe(true);
    expect(enabled.has('l2')).toBe(true);
    expect(enabled.has('l3')).toBe(true);
    expect(enabled.has('l4')).toBe(false);
  });

  it('maps capabilities to permission options with runtime ids', () => {
    const modules = [module('l2', 'l1', 2, 'users', 'Users')];
    const options = capabilitiesToMasterDataPermissionOptions(
      [capability('cap-1', 'users', 'users:users:read')],
      modules,
    );
    expect(options).toHaveLength(1);
    expect(options[0]?.runtimeCapabilityId).toBe('cap-1');
    expect(options[0]?.moduleSlug).toBe('users');
  });
});
