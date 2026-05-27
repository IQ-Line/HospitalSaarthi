import { normalizeCapabilityKey } from '@/lib/principal-capabilities';
import type { ModuleCatalogIndex } from '@/platform/modules/types';
import { catalogSlugVariants } from '@/platform/modules/catalog-slug-variants';
import type { NavigationNode } from './types';
import {
  principalGrantsCatalogModuleSlugRouteAccess,
  principalHasCatalogModuleAction,
} from '@/lib/catalog-route-access';
import { capabilityKeysGrantProductAccess } from './module-product-access';

/** First segment of a runtime capability key (catalog L2+ module slug). */
export function capabilityKeyModuleSegment(key: string): string | null {
  const segment = normalizeCapabilityKey(key).split(':')[0]?.trim();
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

  const stem = (value: string) => (value.endsWith('es') ? value.slice(0, -2) : value.replace(/s$/, ''));
  const slugStem = stem(slug);
  const segStem = stem(seg);
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

/** L2 product keys whose resource segment grants shell nav (e.g. `visitpad-master:visitpad:view`). */
const PRODUCT_WIDE_NAV_RESOURCES = new Set(['visitpad']);

const VISITPAD_MASTER_SHELL_NAV_ACTIONS = ['read', 'manage', 'create', 'update', 'delete'] as const;

/**
 * Visitpad L3 leaves when the principal holds L2 `visitpad-master` shell keys
 * (`visitpad:view` / `visitpad:create` or `catalog:read` / `catalog:manage`, etc.)
 * without per-section L3 keys (`units:units:read`, …).
 */
export function principalGrantsVisitpadMasterShellLeafNav(
  capabilityKeys: ReadonlySet<string>,
  route: string,
  productSlugs: readonly string[],
): boolean {
  if (route !== '/visitpad' && !route.startsWith('/visitpad/')) {
    return false;
  }

  const visitpadProducts = productSlugs.filter(
    (slug) =>
      catalogSlugMatchesRouteSegment(slug, 'visitpad-master') ||
      catalogSlugMatchesRouteSegment(slug, 'master-data'),
  );
  if (visitpadProducts.length === 0) {
    return false;
  }

  if (principalHasProductWideNavCapability(capabilityKeys, visitpadProducts)) {
    return true;
  }

  for (const action of VISITPAD_MASTER_SHELL_NAV_ACTIONS) {
    if (principalHasCatalogModuleAction(capabilityKeys, 'visitpad-master', action)) {
      return true;
    }
  }

  return false;
}

/**
 * True when the principal holds an L1 product shell key (`<product>:visitpad:view|create`)
 * that should authorize every child route under that product manifest.
 */
export function principalHasProductWideNavCapability(
  capabilityKeys: ReadonlySet<string>,
  catalogProductSlugs: readonly string[],
): boolean {
  if (catalogProductSlugs.length === 0) {
    return false;
  }

  for (const rawKey of capabilityKeys) {
    const parts = normalizeCapabilityKey(rawKey).split(':');
    if (parts.length < 3) {
      continue;
    }
    const [l1, resource, action] = parts;
    if (!l1 || !resource || !action) {
      continue;
    }
    if (action !== 'view' && action !== 'create') {
      continue;
    }
    if (!PRODUCT_WIDE_NAV_RESOURCES.has(resource)) {
      continue;
    }
    if (catalogProductSlugs.some((productSlug) => catalogSlugMatchesRouteSegment(productSlug, l1))) {
      return true;
    }
  }
  return false;
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
    if (principalGrantsCatalogModuleSlugRouteAccess(input.capabilityKeys, moduleSlugs)) {
      return true;
    }
    if (
      principalGrantsVisitpadMasterShellLeafNav(
        input.capabilityKeys,
        node.route,
        productSlugs,
      )
    ) {
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
