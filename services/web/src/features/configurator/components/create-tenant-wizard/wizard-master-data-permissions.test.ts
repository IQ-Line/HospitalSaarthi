import { describe, expect, it } from 'vitest';
import type { Capability } from '@/features/user-management/types';
import type { Module, ModulePermission, Permission } from '@/features/master-data/types';
import {
  buildMasterDataPermissionOptions,
  buildWizardCapabilityTree,
  buildWizardRolePermissionCatalog,
  defaultCapabilityIdsFromMasterDataOptions,
  defaultSelectableCapabilityIds,
} from './wizard-master-data-permissions';

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
];

const permissions: Permission[] = [
  {
    id: 'p1',
    name: 'Read user',
    slug: 'user.read',
    action: 'read',
    description: null,
    is_active: true,
    is_deleted: false,
    created_by: null,
    updated_by: null,
    created_at: '',
    updated_at: '',
  },
];

describe('wizard-master-data-permissions', () => {
  it('builds options from module_permissions for enabled modules', () => {
    const links: ModulePermission[] = [
      {
        id: 'mp1',
        slug: 'user.read',
        module_id: 'm-um',
        permission_id: 'p1',
        is_default: true,
        is_active: true,
        is_deleted: false,
        created_by: null,
        updated_by: null,
        created_at: '',
        updated_at: '',
      },
    ];
    const runtime: Capability[] = [
      {
        id: 'c1',
        capability_key: 'users:users:read',
        module: 'user-management',
        feature: 'user',
        action: 'read',
        display_name: 'Read',
        is_active: true,
        source_catalog: 'master_data',
        source_module_slug: 'user-management',
        source_permission_slug: 'user.read',
      },
    ];

    const options = buildMasterDataPermissionOptions(
      modules,
      permissions,
      links,
      new Set(['m-um']),
      runtime,
    );

    expect(options).toHaveLength(1);
    expect(options[0]?.permissionName).toBe('Read user');
    expect(options[0]?.runtimeCapabilityId).toBe('c1');
    expect(defaultCapabilityIdsFromMasterDataOptions(options)).toEqual(['c1']);
  });

  it('defaultSelectableCapabilityIds selects all synced permissions, not only is_default', () => {
    const links: ModulePermission[] = [
      {
        id: 'mp1',
        slug: 'user.read',
        module_id: 'm-um',
        permission_id: 'p1',
        is_default: true,
        is_active: true,
        is_deleted: false,
        created_by: null,
        updated_by: null,
        created_at: '',
        updated_at: '',
      },
      {
        id: 'mp2',
        slug: 'shell.access',
        module_id: 'm-um',
        permission_id: 'p2',
        is_default: false,
        is_active: true,
        is_deleted: false,
        created_by: null,
        updated_by: null,
        created_at: '',
        updated_at: '',
      },
    ];
    const extendedPermissions: Permission[] = [
      ...permissions,
      {
        id: 'p2',
        name: 'Shell access',
        slug: 'shell.access',
        action: 'read',
        description: null,
        is_active: true,
        is_deleted: false,
        created_by: null,
        updated_by: null,
        created_at: '',
        updated_at: '',
      },
    ];
    const runtime: Capability[] = [
      {
        id: 'c1',
        capability_key: 'users:users:read',
        module: 'user-management',
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
        capability_key: 'user-management:shell:access',
        module: 'user-management',
        feature: 'shell',
        action: 'access',
        display_name: 'Shell',
        is_active: true,
        source_catalog: 'master_data',
        source_module_slug: 'user-management',
        source_permission_slug: 'shell.access',
      },
    ];
    const { options, selectableCapabilities } = buildWizardRolePermissionCatalog(
      modules,
      extendedPermissions,
      links,
      new Set(['m-um']),
      runtime,
    );

    expect(defaultCapabilityIdsFromMasterDataOptions(options)).toEqual(['c1']);
    expect(defaultSelectableCapabilityIds(options, selectableCapabilities).sort()).toEqual([
      'c1',
      'c2',
    ]);
  });

  it('excludes module_permissions for modules not enabled in step 2', () => {
    const opdModule: Module = {
      ...modules[0]!,
      id: 'm-opd',
      name: 'OPD',
      slug: 'opd',
      category: 'clinical',
    };
    const links: ModulePermission[] = [
      {
        id: 'mp-opd',
        slug: 'visit.read',
        module_id: 'm-opd',
        permission_id: 'p1',
        is_default: false,
        is_active: true,
        is_deleted: false,
        created_by: null,
        updated_by: null,
        created_at: '',
        updated_at: '',
      },
    ];
    const options = buildMasterDataPermissionOptions(
      [...modules, opdModule],
      permissions,
      links,
      new Set(['m-um']),
      [],
    );
    expect(options).toHaveLength(0);
  });

  it('buildWizardCapabilityTree groups only enabled modules from step 2', () => {
    const opdModule: Module = {
      ...modules[0]!,
      id: 'm-opd',
      name: 'OPD',
      slug: 'opd',
      category: 'clinical',
    };
    const links: ModulePermission[] = [
      {
        id: 'mp-um',
        slug: 'user.read',
        module_id: 'm-um',
        permission_id: 'p1',
        is_default: true,
        is_active: true,
        is_deleted: false,
        created_by: null,
        updated_by: null,
        created_at: '',
        updated_at: '',
      },
      {
        id: 'mp-opd',
        slug: 'visit.read',
        module_id: 'm-opd',
        permission_id: 'p1',
        is_default: false,
        is_active: true,
        is_deleted: false,
        created_by: null,
        updated_by: null,
        created_at: '',
        updated_at: '',
      },
    ];
    const runtime: Capability[] = [
      {
        id: 'c-um',
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
        id: 'c-opd',
        capability_key: 'opd:visit:read',
        module: 'opd',
        feature: 'visit',
        action: 'read',
        display_name: 'Visit read',
        is_active: true,
        source_catalog: 'master_data',
        source_module_slug: 'opd',
        source_permission_slug: 'visit.read',
      },
    ];

    const options = buildMasterDataPermissionOptions(
      [...modules, opdModule],
      permissions,
      links,
      new Set(['m-um']),
      runtime,
    );
    const tree = buildWizardCapabilityTree(options);

    expect(tree).toHaveLength(1);
    expect(tree[0]?.kind).toBe('branch');
    if (tree[0]?.kind === 'branch') {
      expect(tree[0].label).toBe('User Management');
      expect(tree[0].children).toHaveLength(1);
    }
  });

  it('buildWizardRolePermissionCatalog scopes selectable capabilities to step-2 modules', () => {
    const opdModule: Module = {
      ...modules[0]!,
      id: 'm-opd',
      name: 'OPD',
      slug: 'opd',
      category: 'clinical',
    };
    const links: ModulePermission[] = [
      {
        id: 'mp-um',
        slug: 'user.read',
        module_id: 'm-um',
        permission_id: 'p1',
        is_default: true,
        is_active: true,
        is_deleted: false,
        created_by: null,
        updated_by: null,
        created_at: '',
        updated_at: '',
      },
      {
        id: 'mp-opd',
        slug: 'visit.read',
        module_id: 'm-opd',
        permission_id: 'p1',
        is_default: false,
        is_active: true,
        is_deleted: false,
        created_by: null,
        updated_by: null,
        created_at: '',
        updated_at: '',
      },
    ];
    const runtime: Capability[] = [
      {
        id: 'c-um',
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
        id: 'c-opd',
        capability_key: 'opd:visit:read',
        module: 'opd',
        feature: 'visit',
        action: 'read',
        display_name: 'Visit read',
        is_active: true,
        source_catalog: 'master_data',
        source_module_slug: 'opd',
        source_permission_slug: 'visit.read',
      },
    ];

    const { selectableCapabilities } = buildWizardRolePermissionCatalog(
      [...modules, opdModule],
      permissions,
      links,
      new Set(['m-um']),
      runtime,
    );

    expect(selectableCapabilities.map((c) => c.id)).toEqual(['c-um']);
  });
});
