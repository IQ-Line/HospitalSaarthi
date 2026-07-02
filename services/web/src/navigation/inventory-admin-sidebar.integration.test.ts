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

/** inventoryadmin@hospitalsaarthi.dev — Administrator role, inventory L3 masters only. */
const INVENTORY_ADMIN_ATTRIBUTES = {
  iq_tenant_id: 'f47ac10b-58cc-4372-a567-0e02b2c3d480',
  capabilities: [
    'inventory-categories:inventory-categories:read',
    'inventory-uoms:inventory-uoms:read',
    'inventory-item-types:inventory-item-types:read',
  ],
} as const;

const INVENTORY_MASTER_MODULE_ID = '164f4340-d397-44f0-8710-71202ef4776c';

function buildCatalogIndex(): ModuleCatalogIndex {
  const entries: ModuleCatalogEntry[] = [
    {
      id: INVENTORY_MASTER_MODULE_ID,
      slug: 'inventory-master',
      name: 'Inventory Master',
      icon: null,
      category: 'administrative',
      is_active: true,
      level: 1,
      parent_id: null,
      module_kind: 'product',
      display_order: 0,
      visibility_scope: 'tenant',
    },
    {
      id: 'cat-id',
      slug: 'inventory-categories',
      name: 'Categories',
      icon: null,
      category: 'administrative',
      is_active: true,
      level: 3,
      parent_id: INVENTORY_MASTER_MODULE_ID,
      module_kind: 'product',
      display_order: 0,
      visibility_scope: 'tenant',
    },
  ];

  const bySlug = new Map(entries.map((e) => [e.slug, e]));
  const byId = new Map(entries.map((e) => [e.id, e]));
  return { bySlug, byId };
}

describe('inventory admin sidebar (admin role + inventory-master tenant module)', () => {
  beforeEach(() => {
    clearModuleRegistryForTests();
    invalidateComposedNavigationCache();
    registerBuiltinModuleManifests();
  });

  it('shows Inventory & Supply Masters for administrator role code', () => {
    const capabilityKeys = new Set(capabilityKeysFromPrincipalAttributes(INVENTORY_ADMIN_ATTRIBUTES));
    const index = buildCatalogIndex();
    const catalogSlugs = catalogSlugsFromTenantModules(index, [
      { module_id: INVENTORY_MASTER_MODULE_ID, is_active: true },
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

    const rootIds = filtered.map((n) => n.id);
    expect(rootIds).toContain('inventory-master');
    // Operational Inventory requires inventory product capabilities; masters-only admins omit it.
    expect(rootIds).not.toContain('inventory');
  });
});
