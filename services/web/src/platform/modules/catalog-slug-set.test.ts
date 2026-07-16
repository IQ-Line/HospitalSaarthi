import { beforeEach, describe, expect, it } from 'vitest';
import type { ModuleCatalogIndex } from './types';
import {
  buildEnabledModuleSlugsFromCatalog,
  catalogSlugSetFromIndex,
  catalogSlugsFromTenantModules,
  enrichAdminInventoryNavCatalogSlugs,
} from './use-enabled-tenant-modules';
import { clearModuleRegistryForTests } from './module-registry';
import { invalidateComposedNavigationCache } from './module-manifest-loader';
import { registerBuiltinModuleManifests } from './register-builtin-modules';

function indexWith(
  entries: Array<{
    id: string;
    slug: string;
    level: number;
    parent_id: string | null;
  }>,
): ModuleCatalogIndex {
  const byId = new Map();
  const bySlug = new Map();
  for (const entry of entries) {
    const row = {
      id: entry.id,
      slug: entry.slug,
      name: entry.slug,
      icon: null,
      category: 'core' as const,
      is_active: true,
      level: entry.level,
      parent_id: entry.parent_id,
    };
    byId.set(entry.id, row);
    bySlug.set(entry.slug, row);
  }
  return { byId, bySlug };
}

describe('catalog slug resolution for sidebar module gates', () => {
  beforeEach(() => {
    clearModuleRegistryForTests();
    invalidateComposedNavigationCache();
    registerBuiltinModuleManifests();
  });

  it('includes only L1 catalog slugs for platform super-admin nav', () => {
    const slugs = catalogSlugSetFromIndex(
      indexWith([
        { id: '1', slug: 'user-management', level: 1, parent_id: null },
        { id: '2', slug: 'master-data', level: 1, parent_id: null },
        { id: '3', slug: 'visitpad-master', level: 2, parent_id: '2' },
        { id: '4', slug: 'orphan-l2', level: 2, parent_id: null },
      ]),
    );

    expect(slugs.has('user-management')).toBe(true);
    expect(slugs.has('master-data')).toBe(true);
    expect(slugs.has('visitpad-master')).toBe(false);
    expect(slugs.has('orphan-l2')).toBe(false);
  });

  it('maps tenant_modules rows to manifest slugs (tenant users)', () => {
    const index = indexWith([
      { id: '1', slug: 'master-data', level: 1, parent_id: null },
      { id: '2', slug: 'visitpad-master', level: 2, parent_id: '1' },
      { id: '3', slug: 'user-management', level: 1, parent_id: null },
    ]);

    const slugs = catalogSlugsFromTenantModules(index, [
      { module_id: '2', is_active: true },
    ]);

    const enabled = buildEnabledModuleSlugsFromCatalog(slugs);
    expect(enabled.has('visitpad-master')).toBe(true);
    expect(enabled.has('visitpad')).toBe(true);
    expect(enabled.has('user-management')).toBe(false);
  });

  it('super-admin enabled slugs include visitpad when master-data L1 is active', () => {
    const index = indexWith([
      { id: '1', slug: 'master-data', level: 1, parent_id: null },
      { id: '2', slug: 'visitpad-master', level: 2, parent_id: '1' },
      { id: '3', slug: 'user-management', level: 1, parent_id: null },
    ]);

    const catalogSlugs = catalogSlugSetFromIndex(index);
    expect(catalogSlugs.has('master-data')).toBe(true);
    expect(catalogSlugs.has('visitpad-master')).toBe(false);

    const enabled = buildEnabledModuleSlugsFromCatalog(catalogSlugs);
    expect(enabled.has('visitpad')).toBe(true);
    expect(enabled.has('master-data')).toBe(true);
    expect(enabled.has('user-management')).toBe(true);
  });

  it('super-admin enabled slugs include inventory when inventory L1 is active', () => {
    const index = indexWith([
      { id: '1', slug: 'inventory', level: 1, parent_id: null },
      { id: '2', slug: 'inventory-master', level: 2, parent_id: '1' },
    ]);

    const enabled = buildEnabledModuleSlugsFromCatalog(catalogSlugSetFromIndex(index));
    expect(enabled.has('inventory')).toBe(true);
    expect(enabled.has('inventory-master')).toBe(false);
  });

  it('admin enrichment unlocks inventory-master and store-config for facility/tenant-admin gates', () => {
    const index = indexWith([
      { id: '1', slug: 'master-data', level: 1, parent_id: null },
      { id: '2', slug: 'configurator', level: 1, parent_id: null },
    ]);
    const l1Only = catalogSlugSetFromIndex(index, { excludeProductModules: true });
    const enabled = buildEnabledModuleSlugsFromCatalog(enrichAdminInventoryNavCatalogSlugs(l1Only));

    expect(enabled.has('inventory-master')).toBe(true);
    expect(enabled.has('store-config')).toBe(true);
    expect(enabled.has('inventory-supply-masters')).toBe(true);
    expect(enabled.has('store-configuration')).toBe(true);
    // Operational inventory remains L1-gated — not injected for Onboarding-only admin shells.
    expect(enabled.has('inventory')).toBe(false);
  });
});
