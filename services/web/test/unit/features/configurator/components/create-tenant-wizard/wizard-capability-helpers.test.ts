import { describe, expect, it } from 'vitest';
import type { Capability } from '@/features/user-management/types';
import type { Module } from '@/features/master-data/types';
import { buildChildrenMap } from '../../../../../../src/features/configurator/components/create-tenant-wizard/wizard-helpers';
import {
  expandModuleSlugsWithDescendants,
  moduleSlugsForIds,
  scopeRuntimeCapabilitiesToEnabledSlugs,
} from '../../../../../../src/features/configurator/components/create-tenant-wizard/wizard-capability-helpers';
import { defaultEnabledModuleIds } from '../../../../../../src/features/configurator/components/create-tenant-wizard/wizard-helpers';

const modules: Module[] = [
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
    id: 'm-opd',
    parent_id: null,
    name: 'OPD',
    slug: 'opd',
    description: null,
    category: 'clinical',
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
    id: 'm-allergens',
    parent_id: 'm-md',
    name: 'Allergens',
    slug: 'allergens',
    description: null,
    category: 'clinical',
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
];

describe('wizard-capability-helpers', () => {
  it('defaultEnabledModuleIds pre-selects root modules and their subtrees', () => {
    const childMap = buildChildrenMap(modules);
    expect([...defaultEnabledModuleIds(modules, childMap)].sort()).toEqual(
      ['m-allergens', 'm-md', 'm-opd', 'm-um', 'm-users'].sort(),
    );
  });

  it('expandModuleSlugsWithDescendants includes child catalog slugs', () => {
    expect([...expandModuleSlugsWithDescendants(['master-data'], modules)].sort()).toEqual(
      ['allergens', 'master-data'].sort(),
    );
  });

  it('moduleSlugsForIds maps only selected catalog module ids to slugs', () => {
    expect(moduleSlugsForIds(new Set(['m-um']), modules)).toEqual(['user-management']);
  });

  it('scopeRuntimeCapabilitiesToEnabledSlugs uses source_module_slug from catalog sync', () => {
    const caps: Capability[] = [
      {
        id: 'c1',
        capability_key: 'users:users:read',
        module: 'um',
        feature: 'user',
        action: 'read',
        display_name: 'Read',
        is_active: true,
        source_catalog: 'master_data',
        source_module_slug: 'user-management',
        source_permission_slug: 'user.read',
      },
      {
        id: 'c2',
        capability_key: 'opd:visit:read',
        module: 'opd',
        feature: 'visit',
        action: 'read',
        display_name: 'Read',
        is_active: true,
        source_catalog: 'master_data',
        source_module_slug: 'opd',
        source_permission_slug: 'visit.read',
      },
      {
        id: 'c3',
        capability_key: 'orphan:read',
        module: 'orphan',
        feature: 'x',
        action: 'read',
        display_name: 'Orphan',
        is_active: true,
      },
    ];
    expect(
      scopeRuntimeCapabilitiesToEnabledSlugs(caps, ['user-management'], modules).map((c) => c.id),
    ).toEqual(['c1']);
  });

  it('scopeRuntimeCapabilitiesToEnabledSlugs includes capabilities on descendant modules', () => {
    const caps: Capability[] = [
      {
        id: 'c-allergens',
        capability_key: 'allergens:allergens:read',
        module: 'allergens',
        feature: 'allergens',
        action: 'read',
        display_name: 'Read',
        is_active: true,
        source_catalog: 'master_data',
        source_module_slug: 'allergens',
        source_permission_slug: 'allergens:read',
      },
    ];
    expect(
      scopeRuntimeCapabilitiesToEnabledSlugs(caps, ['master-data'], modules).map((c) => c.id),
    ).toEqual(['c-allergens']);
  });
});
