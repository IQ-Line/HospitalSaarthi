import { canonicalizeRuntimeCapabilityKey } from '@/lib/legacy-capability-key-remap';
import { normalizeCapabilityKey } from '@/lib/principal-capabilities';
import type { ModuleCatalogIndex } from '@/platform/modules/types';
import { catalogSlugVariants } from '@/platform/modules/catalog-slug-variants';
import type { NavigationNode } from './types';
import { capabilityKeysGrantProductAccess } from './module-product-access';

/** First segment of a runtime capability key (catalog L2+ module slug). */
export function capabilityKeyModuleSegment(key: string): string | null {
  const canonical = canonicalizeRuntimeCapabilityKey(normalizeCapabilityKey(key));
  const segment = canonical.split(':')[0]?.trim();
  return segment || null;
}

export function buildPrincipalCapabilityModuleSegments(
  capabilityKeys: ReadonlySet<string>,
): ReadonlySet<string> {
  const segments = new Set<string>();
  for (const key of capabilityKeys) {
    const segment = capabilityKeyModuleSegment(key);
    if (segment) {
      segments.add(segment);
      for (const variant of catalogSlugVariants(segment)) {
        segments.add(variant);
      }
    }
  }
  return segments;
}

/**
 * Match SPA route path segment to Master Data `modules.slug` (handles pluralization and hyphens).
 */
export function catalogSlugMatchesRouteSegment(catalogSlug: string, routeSegment: string): boolean {
  const slug = catalogSlug.trim().toLowerCase();
  const seg = routeSegment.trim().toLowerCase();
  if (!slug || !seg) {
    return false;
  }
  if (slug === seg) {
    return true;
  }

  const slugNorm = slug.replace(/-/g, '');
  const segNorm = seg.replace(/-/g, '');
  if (slugNorm === segNorm) {
    return true;
  }

  if (slug.endsWith(`-${seg}`) || slug.endsWith(seg)) {
    return true;
  }
  // Hyphen-boundary prefix only (`unit` must not match `conversions` via bare startsWith).
  if (slug.startsWith(`${seg}-`)) {
    return true;
  }

  const slugStem = slug.replace(/s$/, '');
  const segStem = seg.replace(/s$/, '');
  return slugStem === segStem || slugStem === seg || segStem === slug;
}

export function inferRoutePathSegmentAfterPrefix(route: string, routePrefix?: string): string | null {
  const routeParts = route.split('/').filter(Boolean);
  if (routeParts.length === 0) {
    return null;
  }

  if (!routePrefix) {
    return routeParts.length > 1 ? (routeParts[1] ?? null) : null;
  }

  const prefixParts = routePrefix.split('/').filter(Boolean);
  if (routeParts.length <= prefixParts.length) {
    return null;
  }
  return routeParts[prefixParts.length] ?? null;
}

export function inferRoutePrefixFromRoute(route: string): string | undefined {
  const parts = route.split('/').filter(Boolean);
  if (parts.length === 0) {
    return undefined;
  }
  return `/${parts[0]}`;
}

/**
 * Catalog module slugs that may authorize a nav route (explicit override, path segment, catalog fuzzy match).
 */
export function resolveCatalogModuleSlugsForNavRoute(
  route: string,
  options?: {
    routePrefix?: string;
    catalogModuleSlug?: string;
    catalogIndex?: ModuleCatalogIndex | null;
  },
): readonly string[] {
  const candidates = new Set<string>();

  if (options?.catalogModuleSlug) {
    candidates.add(options.catalogModuleSlug);
    for (const variant of catalogSlugVariants(options.catalogModuleSlug)) {
      candidates.add(variant);
    }
  }

  const segment = inferRoutePathSegmentAfterPrefix(route, options?.routePrefix);
  if (segment) {
    candidates.add(segment);
    for (const variant of catalogSlugVariants(segment)) {
      candidates.add(variant);
    }

    if (options?.catalogIndex) {
      for (const entry of options.catalogIndex.bySlug.values()) {
        if (catalogSlugMatchesRouteSegment(entry.slug, segment)) {
          candidates.add(entry.slug);
          for (const variant of catalogSlugVariants(entry.slug)) {
            candidates.add(variant);
          }
        }
      }
    }
  }

  return [...candidates];
}

export function capabilityKeysGrantModuleSlugAccess(
  capabilityModuleSegments: ReadonlySet<string>,
  moduleSlugs: readonly string[],
): boolean {
  if (moduleSlugs.length === 0 || capabilityModuleSegments.size === 0) {
    return false;
  }

  for (const slug of moduleSlugs) {
    for (const variant of catalogSlugVariants(slug)) {
      if (capabilityModuleSegments.has(variant)) {
        return true;
      }
    }
  }
  return false;
}

export type NavCapabilityAccessInput = {
  bypassCapabilityGates?: boolean;
  capabilityKeys: ReadonlySet<string>;
  capabilityModuleSegments: ReadonlySet<string>;
  catalogIndex: ModuleCatalogIndex | null;
  hasAnyCapability: (keys: readonly string[]) => boolean;
  hasAllCapabilities: (keys: readonly string[]) => boolean;
  hasAnyCapabilityForProduct?: (catalogProductSlugs: readonly string[]) => boolean;
};

export function catalogProductSlugsForNode(node: NavigationNode): readonly string[] {
  if (node.requiredModulesAny?.length) {
    return node.requiredModulesAny;
  }
  if (node.requiredModules?.length) {
    return node.requiredModules;
  }
  return [];
}

/**
 * Whether a nav node should be visible for the current principal (UX gate; PDP remains authoritative).
 */
export function principalGrantsNavNodeAccess(
  input: NavCapabilityAccessInput,
  node: NavigationNode,
  options?: {
    parentProductSlugs?: readonly string[];
    routePrefix?: string;
  },
): boolean {
  if (input.bypassCapabilityGates) {
    return true;
  }

  const productSlugs = [
    ...catalogProductSlugsForNode(node),
    ...(options?.parentProductSlugs ?? []),
  ];

  if (node.requiredCapabilitiesAll?.length) {
    return input.hasAllCapabilities(node.requiredCapabilitiesAll);
  }

  if (node.requiredCapabilities?.length) {
    if (input.hasAnyCapability(node.requiredCapabilities)) {
      return true;
    }
    if (productSlugs.length && input.hasAnyCapabilityForProduct?.(productSlugs)) {
      return true;
    }
  }

  if (node.route) {
    const routePrefix = options?.routePrefix ?? inferRoutePrefixFromRoute(node.route);
    const pathSegment = inferRoutePathSegmentAfterPrefix(node.route, routePrefix);
    const moduleSlugs = resolveCatalogModuleSlugsForNavRoute(node.route, {
      routePrefix,
      catalogModuleSlug: node.catalogModuleSlug,
      catalogIndex: input.catalogIndex,
    });
    if (capabilityKeysGrantModuleSlugAccess(input.capabilityModuleSegments, moduleSlugs)) {
      return true;
    }
    // Module index routes (no L2 path segment): any L2+ key under the L1 product, or route prefix slug.
    if (!pathSegment) {
      if (productSlugs.length && input.hasAnyCapabilityForProduct?.(productSlugs)) {
        return true;
      }
      if (routePrefix) {
        const prefixSlug = routePrefix.replace(/^\//, '').trim();
        if (
          prefixSlug &&
          capabilityKeysGrantModuleSlugAccess(input.capabilityModuleSegments, [prefixSlug])
        ) {
          return true;
        }
      }
      if (
        !node.requiredCapabilities?.length &&
        !node.requiredCapabilitiesAll?.length &&
        productSlugs.length === 0
      ) {
        return true;
      }
      return false;
    }
    return false;
  }

  // Nav group (no route): visible when product-level access exists; leaves are pruned separately.
  if (productSlugs.length) {
    return input.hasAnyCapabilityForProduct?.(productSlugs) === true;
  }

  return false;
}

export function buildNavCapabilityAccessInput(
  capabilityKeys: ReadonlySet<string>,
  catalogIndex: ModuleCatalogIndex | null,
  bypassCapabilityGates: boolean,
  hasAnyCapabilityForProduct?: (catalogProductSlugs: readonly string[]) => boolean,
): NavCapabilityAccessInput {
  return {
    bypassCapabilityGates,
    capabilityKeys,
    capabilityModuleSegments: buildPrincipalCapabilityModuleSegments(capabilityKeys),
    catalogIndex,
    hasAnyCapability: (keys) =>
      bypassCapabilityGates || keys.some((key) => capabilityKeys.has(normalizeCapabilityKey(key))),
    hasAllCapabilities: (keys) =>
      bypassCapabilityGates || keys.every((key) => capabilityKeys.has(normalizeCapabilityKey(key))),
    hasAnyCapabilityForProduct,
  };
}

/** Re-export for tests that assert product-level grants without nav nodes. */
export { capabilityKeysGrantProductAccess };
