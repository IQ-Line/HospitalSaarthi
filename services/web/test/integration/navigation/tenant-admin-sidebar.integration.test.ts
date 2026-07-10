import { describe, expect, it, beforeEach } from 'vitest';
import { capabilityKeysFromPrincipalAttributes } from '@/lib/principal-capabilities';
import {
  CFG_SHELL_ACCESS,
  FD_SHELL_ACCESS,
  MD_SHELL_ACCESS,
} from '@/lib/runtime-capability-keys';
import { filterNavigationTree } from '@/navigation/filter-navigation-tree';
import { buildNavCapabilityAccessInput } from '@/navigation/nav-capability-access';
import { capabilityKeysGrantProductAccess } from '@/navigation/module-product-access';
import {
  buildEnabledModuleSlugsFromCatalog,
  catalogSlugsFromTenantModules,
} from '@/platform/modules/use-enabled-tenant-modules';
import type { ModuleCatalogIndex } from '@/platform/modules/types';
import {
  clearModuleRegistryForTests,
  composeNavigationManifest,
  getRegisteredModuleManifests,
  invalidateComposedNavigationCache,
  registerBuiltinModuleManifests,
} from '@/platform/modules';

/** Principal + tenant_modules fixture from HIMS Dev Hospital tenant-admin (May 2026). */
const TENANT_ADMIN_ATTRIBUTES = {
  iq_tenant_id: 'f47ac10b-58cc-4372-a567-0e02b2c3d480',
  capabilities: [
    CFG_SHELL_ACCESS,
    'empi:patient:create',
    'empi:patient:read',
    FD_SHELL_ACCESS,
    MD_SHELL_ACCESS,
    'opd:patient:read',
    'opd:visit:create',
    'opd:visit:read',
    'role-capabilities:role-capabilities:create',
    'role-capabilities:role-capabilities:delete',
    'role-capabilities:role-capabilities:read',
    'role-capabilities:role-capabilities:update',
    'user-capabilities:user-capabilities:create',
    'user-capabilities:user-capabilities:delete',
    'user-capabilities:user-capabilities:read',
    'user-capabilities:user-capabilities:update',
    'user-roles:role:assign',
    'user-roles:user-roles:create',
    'user-roles:user-roles:delete',
    'user-roles:user-roles:read',
    'user-roles:user-roles:update',
    'users:users:create',
    'users:users:delete',
    'users:users:read',
    'users:users:update',
    'visitpad-master:catalog:manage',
    'visitpad-master:catalog:read',
    'visitpad-master:catalog:update',
    'visitpad-master:visitpad:create',
    'visitpad-master:visitpad:view',
  ],
} as const;

const ACTIVE_TENANT_MODULE_IDS = [
  'a12a6df6-150c-4331-8ba3-79c8a43684f5', // configurator
  'c7fda4e6-8be0-4e0a-947d-277bc820a1be', // empi
  '66666666-6666-4666-8666-666666666601', // frontdesk
  '40c91729-8169-45e1-8f54-f2fe88bcf8d0', // master-data
  'a1000001-0001-4001-8001-000000000001', // opd
  '4ad39707-f301-462c-afe7-6b633f219920', // user-management
  '5936863b-e3c6-4187-b83a-eb9d973bcc48', // billing-and-finance
  '5cc2bfb8-aec9-4aee-8546-a5aa830f7133', // visitpad-master
] as const;

function buildCatalogIndex(): ModuleCatalogIndex {
  const entries = [
    ['configurator', 'a12a6df6-150c-4331-8ba3-79c8a43684f5', 1, null],
    ['empi', 'c7fda4e6-8be0-4e0a-947d-277bc820a1be', 1, null],
    ['master-data', '40c91729-8169-45e1-8f54-f2fe88bcf8d0', 1, null],
    ['user-management', '4ad39707-f301-462c-afe7-6b633f219920', 1, null],
    ['frontdesk', '66666666-6666-4666-8666-666666666601', 1, null],
    ['opd', 'a1000001-0001-4001-8001-000000000001', 1, null],
    ['billing-and-finance', '5936863b-e3c6-4187-b83a-eb9d973bcc48', 1, null],
    ['visitpad-master', '5cc2bfb8-aec9-4aee-8546-a5aa830f7133', 2, '40c91729-8169-45e1-8f54-f2fe88bcf8d0'],
    ['departments', 'dd106d74-e04c-41fe-a84d-dfd35df7b394', 2, '40c91729-8169-45e1-8f54-f2fe88bcf8d0'],
    ['opd', 'a1000001-0001-4001-8001-000000000001', 1, null],
    ['registration', '3329774e-468b-425d-a211-0f58f84f0e17', 2, '66666666-6666-4666-8666-666666666601'],
    ['units', 'a16a644b-c0ca-4bec-8e4a-18b387f2cec3', 3, '5cc2bfb8-aec9-4aee-8546-a5aa830f7133'],
    ['vitals', '19ec1f65-f12a-40e1-94ed-9116d7c44914', 3, '5cc2bfb8-aec9-4aee-8546-a5aa830f7133'],
  ] as const;

  const bySlug = new Map();
  const byId = new Map();
  for (const [slug, id, level, parent_id] of entries) {
    const entry = {
      id,
      slug,
      name: slug,
      icon: null,
      category: 'core',
      is_active: true,
      level,
      parent_id,
      module_kind: 'platform' as const,
      display_order: 0,
      visibility_scope: 'tenant' as const,
    };
    bySlug.set(slug, entry);
    byId.set(id, entry);
  }
  return { bySlug, byId };
}

/** Clinical role fixture — master-data shell only, no visitpad-master keys. */
const CLINICAL_ATTRIBUTES = {
  capabilities: [
    CFG_SHELL_ACCESS,
    'empi:patient:create',
    'empi:patient:read',
    FD_SHELL_ACCESS,
    MD_SHELL_ACCESS,
    'opd:patient:read',
    'opd:visit:create',
    'opd:visit:read',
  ],
} as const;

function filterSidebarForAttributes(
  attributes: { capabilities: readonly string[] },
  tenantModuleIds: readonly string[],
) {
  const capabilityKeys = new Set(capabilityKeysFromPrincipalAttributes(attributes));
  const index = buildCatalogIndex();
  const catalogSlugs = catalogSlugsFromTenantModules(
    index,
    tenantModuleIds.map((module_id) => ({ module_id, is_active: true })),
  );
  const enabledModuleSlugs = buildEnabledModuleSlugsFromCatalog(catalogSlugs);
  const manifest = composeNavigationManifest(getRegisteredModuleManifests());
  return filterNavigationTree(manifest, {
    hasCapability: (key) => capabilityKeys.has(key),
    hasAnyCapability: (keys) => keys.some((key) => capabilityKeys.has(key)),
    hasAllCapabilities: (keys) => keys.every((key) => capabilityKeys.has(key)),
    hasAnyCapabilityForProduct: (slugs) =>
      capabilityKeysGrantProductAccess(capabilityKeys, slugs, index),
    navAccess: buildNavCapabilityAccessInput(
      capabilityKeys,
      index,
      false,
      (slugs) => capabilityKeysGrantProductAccess(capabilityKeys, slugs, index),
    ),
    enabledModuleSlugs,
    bypassCapabilityGates: false,
    isSuperAdmin: false,
    isTenantAdmin: false,
    catalogIndex: index,
  });
}

describe('tenant-admin HIMS Dev Hospital sidebar (no capability bypass)', () => {
  beforeEach(() => {
    clearModuleRegistryForTests();
    invalidateComposedNavigationCache();
    registerBuiltinModuleManifests();
  });

  it('shows configurator, master-data, visitpad-master children, user-management, frontdesk, opd', () => {
    const capabilityKeys = new Set(capabilityKeysFromPrincipalAttributes(TENANT_ADMIN_ATTRIBUTES));
    const index = buildCatalogIndex();
    const catalogSlugs = catalogSlugsFromTenantModules(
      index,
      ACTIVE_TENANT_MODULE_IDS.map((module_id) => ({ module_id, is_active: true })),
    );
    const enabledModuleSlugs = buildEnabledModuleSlugsFromCatalog(catalogSlugs);

    const manifest = composeNavigationManifest(getRegisteredModuleManifests());
    const filtered = filterNavigationTree(
      manifest,
      {
        hasCapability: (key) => capabilityKeys.has(key),
        hasAnyCapability: (keys) => keys.some((key) => capabilityKeys.has(key)),
        hasAllCapabilities: (keys) => keys.every((key) => capabilityKeys.has(key)),
        hasAnyCapabilityForProduct: (slugs) =>
          capabilityKeysGrantProductAccess(capabilityKeys, slugs, index),
        navAccess: buildNavCapabilityAccessInput(
          capabilityKeys,
          index,
          false,
          (slugs) => capabilityKeysGrantProductAccess(capabilityKeys, slugs, index),
        ),
        enabledModuleSlugs,
        bypassCapabilityGates: false,
        isSuperAdmin: false,
        isTenantAdmin: true,
        catalogIndex: index,
      },
    );

    const rootIds = filtered.map((n) => n.id);
    expect(rootIds).toContain('configurator');
    expect(rootIds).toContain('master-data');
    expect(rootIds).toContain('user-management');
    expect(rootIds).toContain('frontdesk');

    const visitpadMaster = filtered
      .find((n) => n.id === 'master-data')
      ?.children?.find((c) => c.id === 'visitpad-master');
    expect(visitpadMaster).toBeDefined();
    const visitpadChildIds = visitpadMaster?.children?.map((c) => c.id) ?? [];
    expect(visitpadChildIds).toContain('visitpad-units');
    expect(visitpadChildIds).toContain('visitpad-vitals');
    expect(visitpadChildIds.length).toBeGreaterThanOrEqual(10);
  });
});

describe('clinical role sidebar (no visitpad capabilities)', () => {
  beforeEach(() => {
    clearModuleRegistryForTests();
    invalidateComposedNavigationCache();
    registerBuiltinModuleManifests();
  });

  it('hides Visitpad Master when principal has master-data:shell:access only', () => {
    const filtered = filterSidebarForAttributes(CLINICAL_ATTRIBUTES, ACTIVE_TENANT_MODULE_IDS);

    const masterData = filtered.find((n) => n.id === 'master-data');
    expect(masterData).toBeDefined();
    expect(masterData?.children?.some((c) => c.id === 'visitpad-master')).toBe(false);
    expect(masterData?.children?.some((c) => c.id === 'master-data-departments')).toBe(true);
  });
});
