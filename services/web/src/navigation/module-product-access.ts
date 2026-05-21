import { expandModuleSlugsWithDescendants } from '@/features/configurator/components/create-tenant-wizard/wizard-capability-helpers';
import type { Module } from '@/features/master-data/types';
import { catalogSlugMatchesRouteSegment } from '@/navigation/nav-capability-access';
import { capabilityKeysGrantProductAccessFromManifest } from '@/navigation/manifest-product-access';
import { catalogSlugVariants } from '@/platform/modules/catalog-slug-variants';
import { canonicalizeRuntimeCapabilityKey } from '@/lib/legacy-capability-key-remap';
import { normalizeCapabilityKey } from '@/lib/principal-capabilities';
import type { ModuleCatalogIndex } from '@/platform/modules/types';

function catalogModulesFromIndex(index: ModuleCatalogIndex): Module[] {
  const seen = new Set<string>();
  const modules: Module[] = [];
  for (const entry of index.bySlug.values()) {
    if (seen.has(entry.id)) {
      continue;
    }
    seen.add(entry.id);
    modules.push({
      id: entry.id,
      parent_id: entry.parent_id,
      name: entry.name,
      slug: entry.slug,
      description: null,
      category: entry.category,
      version: '1.0.0',
      level: entry.level,
      icon: entry.icon,
      is_active: entry.is_active,
      is_deleted: false,
      created_by: null,
      updated_by: null,
      created_at: '',
      updated_at: '',
    });
  }
  return modules;
}

/**
 * True when the principal holds any runtime key whose first segment matches an L2+
 * module slug under the given L1 catalog product roots (e.g. `users:*` → User Management).
 */
export function capabilityKeysGrantProductAccess(
  capabilityKeys: ReadonlySet<string>,
  catalogProductSlugs: readonly string[],
  catalogIndex: ModuleCatalogIndex | null,
): boolean {
  if (catalogProductSlugs.length === 0 || capabilityKeys.size === 0) {
    return false;
  }

  for (const rawKey of capabilityKeys) {
    const segment = canonicalizeRuntimeCapabilityKey(normalizeCapabilityKey(rawKey)).split(':')[0];
    if (!segment) {
      continue;
    }
    for (const productSlug of catalogProductSlugs) {
      if (catalogSlugMatchesRouteSegment(productSlug, segment)) {
        return true;
      }
      for (const variant of catalogSlugVariants(productSlug)) {
        if (variant === segment) {
          return true;
        }
      }
    }
  }

  if (catalogIndex) {
    const modules = catalogModulesFromIndex(catalogIndex);
    const expandedSlugs = expandModuleSlugsWithDescendants(catalogProductSlugs, modules);

    for (const rawKey of capabilityKeys) {
      const segment = canonicalizeRuntimeCapabilityKey(normalizeCapabilityKey(rawKey)).split(':')[0];
      if (segment && expandedSlugs.has(segment)) {
        return true;
      }
    }
  }

  return capabilityKeysGrantProductAccessFromManifest(capabilityKeys, catalogProductSlugs);
}
