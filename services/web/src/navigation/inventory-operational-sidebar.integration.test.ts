import { beforeEach, describe, expect, it } from 'vitest';
import { capabilityKeysFromPrincipalAttributes } from '@/lib/principal-capabilities';
import { filterNavigationTree } from '@/navigation/filter-navigation-tree';
import { buildNavCapabilityAccessInput } from '@/navigation/nav-capability-access';
import { capabilityKeysGrantProductAccess } from '@/navigation/module-product-access';
import {
  buildEnabledModuleSlugsFromCatalog,
  catalogSlugsFromTenantModules,
} from '@/platform/modules/use-enabled-tenant-modules';
import type { ModuleCatalogEntry, ModuleCatalogIndex } from '@/platform/modules/types';
import {
  clearModuleRegistryForTests,
  composeNavigationManifest,
  getRegisteredModuleManifests,
  invalidateComposedNavigationCache,
  registerBuiltinModuleManifests,
} from '@/platform/modules';

const INVENTORY_L1_ID = 'a1000001-0001-4001-8001-000000000101';
const INVENTORY_STOCK_L2_ID = 'a1000001-0001-4001-8001-000000000102';

function buildOperationalCatalogIndex(): ModuleCatalogIndex {
  const entries: ModuleCatalogEntry[] = [
    {
      id: INVENTORY_L1_ID,
      slug: 'inventory',
      name: 'Inventory',
      icon: null,
      category: 'administrative',
      is_active: true,
      level: 1,
      parent_id: null,
      module_kind: 'product',
      display_order: 130,
      visibility_scope: 'tenant',
    },
    {
      id: INVENTORY_STOCK_L2_ID,
      slug: 'inventory-stock',
      name: 'Stock',
      icon: null,
      category: 'administrative',
      is_active: true,
      level: 2,
      parent_id: INVENTORY_L1_ID,
      module_kind: 'product',
      display_order: 0,
      visibility_scope: 'tenant',
    },
  ];

  const bySlug = new Map(entries.map((e) => [e.slug, e]));
  const byId = new Map(entries.map((e) => [e.id, e]));
  return { bySlug, byId };
}

describe('operational inventory sidebar', () => {
  beforeEach(() => {
    clearModuleRegistryForTests();
    invalidateComposedNavigationCache();
    registerBuiltinModuleManifests();
  });

  it('shows Inventory for administrator role with delegated stock read', () => {
    const capabilityKeys = new Set(
      capabilityKeysFromPrincipalAttributes({
        iq_tenant_id: 'f47ac10b-58cc-4372-a567-0e02b2c3d480',
        capabilities: ['inventory-stock:inventory-stock:read'],
      }),
    );
    const index = buildOperationalCatalogIndex();
    const catalogSlugs = catalogSlugsFromTenantModules(index, [
      { module_id: INVENTORY_L1_ID, is_active: true },
    ]);
    const enabledModuleSlugs = buildEnabledModuleSlugsFromCatalog(catalogSlugs);

    const filtered = filterNavigationTree(
      composeNavigationManifest(getRegisteredModuleManifests()),
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
        principalRoles: ['admin'],
      },
    );

    const inventory = filtered.find((n) => n.id === 'inventory');
    expect(inventory).toBeDefined();
    expect(inventory?.children?.some((c) => c.id === 'inventory-stock')).toBe(true);
  });

  it('shows all operational inventory children for L1 inventory read only', () => {
    const capabilityKeys = new Set(
      capabilityKeysFromPrincipalAttributes({
        iq_tenant_id: 'f47ac10b-58cc-4372-a567-0e02b2c3d480',
        capabilities: ['inventory:inventory:read'],
      }),
    );
    const index = buildOperationalCatalogIndex();
    const catalogSlugs = catalogSlugsFromTenantModules(index, [
      { module_id: INVENTORY_L1_ID, is_active: true },
    ]);
    const enabledModuleSlugs = buildEnabledModuleSlugsFromCatalog(catalogSlugs);

    const filtered = filterNavigationTree(
      composeNavigationManifest(getRegisteredModuleManifests()),
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
        isTenantAdmin: false,
        catalogIndex: index,
        principalRoles: ['inventory-clerk'],
      },
    );

    const inventory = filtered.find((n) => n.id === 'inventory');
    expect(inventory).toBeDefined();
    const childIds = inventory?.children?.map((child) => child.id) ?? [];
    expect(childIds).toEqual(
      expect.arrayContaining([
        'inventory-dashboard',
        'inventory-stock',
        'inventory-indents',
        'inventory-transfers',
        'inventory-grn-logs',
      ]),
    );
  });

  it('shows Inventory for non-admin user with stock read', () => {
    const capabilityKeys = new Set(
      capabilityKeysFromPrincipalAttributes({
        iq_tenant_id: 'f47ac10b-58cc-4372-a567-0e02b2c3d480',
        capabilities: ['inventory-stock:inventory-stock:read'],
      }),
    );
    const index = buildOperationalCatalogIndex();
    const catalogSlugs = catalogSlugsFromTenantModules(index, [
      { module_id: INVENTORY_L1_ID, is_active: true },
    ]);
    const enabledModuleSlugs = buildEnabledModuleSlugsFromCatalog(catalogSlugs);

    const filtered = filterNavigationTree(
      composeNavigationManifest(getRegisteredModuleManifests()),
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
        isTenantAdmin: false,
        catalogIndex: index,
        principalRoles: ['inventory-clerk'],
      },
    );

    expect(filtered.some((n) => n.id === 'inventory')).toBe(true);
  });
});
