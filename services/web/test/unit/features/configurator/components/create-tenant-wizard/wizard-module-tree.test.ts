import { describe, expect, it } from 'vitest';
import type { Module } from '@/features/master-data/types';
import type { MasterDataPermissionOption } from '../../../../../../src/features/configurator/components/create-tenant-wizard/wizard-master-data-permissions';
import {
  filterChildModulesForWizardTree,
  filterRootModulesForEnabledSelection,
  indexPermissionOptionsByModuleId,
  permissionOptionsForModuleNode,
  permissionOptionsForModuleSubtree,
  WIZARD_MODULE_TREE_MAX_LEVEL,
} from '../../../../../../src/features/configurator/components/create-tenant-wizard/wizard-module-tree';

function module(id: string, parentId: string | null, level: number, slug: string): Module {
  return {
    id,
    parent_id: parentId,
    name: slug,
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

function firstOrThrow<T>(items: readonly T[] | undefined, label: string): T {
  const head = items?.[0];
  if (head === undefined) {
    throw new Error(`expected at least one ${label}`);
  }
  return head;
}

describe('wizard-module-tree', () => {
  it('filters roots to enabled step-2 selection', () => {
    const l1a = module('l1-a', null, 1, 'product-a');
    const l1b = module('l1-b', null, 1, 'product-b');
    const l2a = module('l2-a', 'l1-a', 2, 'feature-a');
    const childMap = new Map<string | null, Module[]>([
      [null, [l1a, l1b]],
      ['l1-a', [l2a]],
      ['l1-b', []],
      ['l2-a', []],
    ]);
    const enabled = new Set(['l2-a']);

    const roots = filterRootModulesForEnabledSelection([l1a, l1b], childMap, enabled);
    expect(roots.map((m) => m.id)).toEqual(['l1-a']);
  });

  it('stops module nesting at max wizard level', () => {
    const l1 = module('l1', null, 1, 'product');
    const l2 = module('l2', 'l1', 2, 'feature');
    const l3 = module('l3', 'l2', 3, 'leaf');
    const l4 = module('l4', 'l3', 4, 'deep');
    const childMap = new Map<string | null, Module[]>([
      [null, [l1]],
      ['l1', [l2]],
      ['l2', [l3]],
      ['l3', [l4]],
      ['l4', []],
    ]);
    const enabled = new Set(['l2', 'l4']);

    const children = filterChildModulesForWizardTree(l1, childMap, enabled);
    expect(children.map((m) => m.id)).toEqual(['l2']);
    expect(WIZARD_MODULE_TREE_MAX_LEVEL).toBe(3);
  });

  it('indexes permission options by module slug', () => {
    const modules = [module('m1', null, 1, 'users')];
    const options: MasterDataPermissionOption[] = [
      {
        linkId: 'mp1',
        moduleSlug: 'users',
        moduleName: 'Users',
        permissionSlug: 'users.read',
        permissionName: 'Read',
        permissionAction: 'read',
        isDefault: false,
        runtimeCapabilityId: 'cap-1',
        capabilityKey: 'users:users:read',
      },
    ];
    const byId = indexPermissionOptionsByModuleId(modules, options);
    expect(byId.get('m1')).toHaveLength(1);
    expect(firstOrThrow(byId.get('m1'), 'm1 permission option').runtimeCapabilityId).toBe('cap-1');
  });

  it('permissionOptionsForModuleSubtree rolls up descendants for L1 select-all', () => {
    const l1 = module('l1', null, 1, 'master-data');
    const l2 = module('l2', 'l1', 2, 'modules');
    const l3 = module('l3', 'l2', 3, 'modules-leaf');
    const modules = [l1, l2, l3];
    const childMap = new Map<string | null, Module[]>([
      [null, [l1]],
      ['l1', [l2]],
      ['l2', [l3]],
      ['l3', []],
    ]);
    const options: MasterDataPermissionOption[] = [
      {
        linkId: 'mp1',
        moduleSlug: 'modules-leaf',
        moduleName: 'Modules Leaf',
        permissionSlug: 'read',
        permissionName: 'Read',
        permissionAction: 'read',
        isDefault: false,
        runtimeCapabilityId: 'cap-read',
        capabilityKey: 'modules:modules:read',
      },
    ];
    const optionsByModuleId = indexPermissionOptionsByModuleId(modules, options);
    const enabled = new Set(['l1', 'l2', 'l3']);

    expect(permissionOptionsForModuleNode(l1, childMap, enabled, optionsByModuleId)).toHaveLength(0);
    expect(permissionOptionsForModuleSubtree(l1, childMap, enabled, optionsByModuleId)).toHaveLength(
      1,
    );
    expect(
      firstOrThrow(
        permissionOptionsForModuleSubtree(l1, childMap, enabled, optionsByModuleId),
        'subtree permission option',
      ).runtimeCapabilityId,
    ).toBe('cap-read');
  });
});
