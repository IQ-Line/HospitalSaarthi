import { expandModuleSlugsWithDescendants } from '@/features/configurator/components/create-tenant-wizard/wizard-capability-helpers';
import type { Module } from '@/features/master-data/types';
import { catalogSlugMatchesRouteSegment } from '@/navigation/nav-capability-access';
import { capabilityKeysGrantProductAccessFromManifest } from '@/navigation/manifest-product-access';
import { catalogSlugVariants } from '@/platform/modules/catalog-slug-variants';
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
      module_kind: entry.module_kind,
      display_order: entry.display_order,
      visibility_scope: entry.visibility_scope,
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

/** First (resource) segment of a runtime capability key, after canonicalization. */
function capabilityKeySegments(capabilityKeys: ReadonlySet<string>): string[] {
  const segments: string[] = [];
  for (const rawKey of capabilityKeys) {
    const segment = normalizeCapabilityKey(rawKey).split(':')[0];
    if (segment) {
      segments.push(segment);
    }
  }
  return segments;
}

/** True when a key segment matches a product slug directly or via a slug variant. */
function segmentMatchesProductSlug(segment: string, productSlug: string): boolean {
  if (catalogSlugMatchesRouteSegment(productSlug, segment)) {
    return true;
  }
  for (const variant of catalogSlugVariants(productSlug)) {
    if (variant === segment) {
      return true;
    }
  }
  return false;
}

/** True when any key segment matches any product slug directly or via a variant. */
function segmentsMatchProductSlugs(
  segments: readonly string[],
  catalogProductSlugs: readonly string[],
): boolean {
  for (const segment of segments) {
    for (const productSlug of catalogProductSlugs) {
      if (segmentMatchesProductSlug(segment, productSlug)) {
        return true;
      }
    }
  }
  return false;
}

/** True when any key segment falls under the product roots expanded to their descendants. */
function segmentsMatchExpandedCatalog(
  segments: readonly string[],
  catalogProductSlugs: readonly string[],
  catalogIndex: ModuleCatalogIndex,
): boolean {
  const modules = catalogModulesFromIndex(catalogIndex);
  const expandedSlugs = expandModuleSlugsWithDescendants(catalogProductSlugs, modules);
  return segments.some((segment) => expandedSlugs.has(segment));
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

  const segments = capabilityKeySegments(capabilityKeys);

  if (segmentsMatchProductSlugs(segments, catalogProductSlugs)) {
    return true;
  }

  if (catalogIndex && segmentsMatchExpandedCatalog(segments, catalogProductSlugs, catalogIndex)) {
    return true;
  }

  return capabilityKeysGrantProductAccessFromManifest(capabilityKeys, catalogProductSlugs);
}
