import { beforeEach, describe, expect, it } from 'vitest';
import type { ModuleCatalogIndex } from './types';
import {
  buildEnabledModuleSlugsFromCatalog,
  catalogSlugSetFromIndex,
  catalogSlugsFromTenantModules,
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
        { id: '2', slug: 'visitpad-templates', level: 1, parent_id: null },
        { id: '3', slug: 'visitpad-section', level: 2, parent_id: '2' },
        { id: '4', slug: 'orphan-l2', level: 2, parent_id: null },
      ]),
    );

    expect(slugs.has('user-management')).toBe(true);
    expect(slugs.has('visitpad-templates')).toBe(true);
    expect(slugs.has('visitpad-section')).toBe(false);
    expect(slugs.has('orphan-l2')).toBe(false);
  });

  it('maps tenant_modules rows to manifest slugs (tenant users)', () => {
    const index = indexWith([
      { id: '1', slug: 'visitpad-templates', level: 1, parent_id: null },
      { id: '2', slug: 'user-management', level: 1, parent_id: null },
    ]);

    const slugs = catalogSlugsFromTenantModules(index, [
      { module_id: '1', is_active: true },
    ]);

    const enabled = buildEnabledModuleSlugsFromCatalog(slugs);
    expect(enabled.has('visitpad-templates')).toBe(true);
    expect(enabled.has('visitpad')).toBe(true);
    expect(enabled.has('user-management')).toBe(false);
  });

  it('super-admin enabled slugs include manifest gates derived from L1 catalog', () => {
    const index = indexWith([
      { id: '1', slug: 'visitpad-templates', level: 1, parent_id: null },
      { id: '2', slug: 'user-management', level: 1, parent_id: null },
      { id: '3', slug: 'master-data', level: 1, parent_id: null },
    ]);

    const catalogSlugs = catalogSlugSetFromIndex(index);
    expect(catalogSlugs.has('visitpad-templates')).toBe(true);
    expect(catalogSlugs.has('visitpad')).toBe(false);

    const enabled = buildEnabledModuleSlugsFromCatalog(catalogSlugs);
    expect(enabled.has('visitpad')).toBe(true);
    expect(enabled.has('visitpad-templates')).toBe(true);
    expect(enabled.has('user-management')).toBe(true);
    expect(enabled.has('master-data')).toBe(true);
  });
});
