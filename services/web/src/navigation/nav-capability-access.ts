import { normalizeCapabilityKey } from '@/lib/principal-capabilities';
import type { ModuleCatalogIndex } from '@/platform/modules/types';
import { catalogSlugVariants } from '@/platform/modules/catalog-slug-variants';
import type { NavigationNode } from './types';
import {
  principalGrantsCatalogModuleSlugRouteAccess,
  principalGrantsProductSubtreeRouteAccess,
  principalHasCatalogModuleAction,
} from '@/lib/catalog-route-access';
import {
  INVENTORY_CATALOG_PRODUCT_SLUGS,
  INVENTORY_ROUTE_PREFIX,
} from '@/features/inventory/lib/inventory-access';
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
export function catalogSlugMatchesRouteSegment(
  catalogSlug: string | null | undefined,
  routeSegment: string | null | undefined,
): boolean {
  const slug = catalogSlug?.trim().toLowerCase() ?? '';
  const seg = routeSegment?.trim().toLowerCase() ?? '';
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

/** Add a slug and all of its catalog variants to a candidate set. */
function addSlugWithVariants(target: Set<string>, slug: string): void {
  target.add(slug);
  for (const variant of catalogSlugVariants(slug)) {
    target.add(variant);
  }
}

/** Catalog slugs whose fuzzy match against the route segment authorizes the route. */
function catalogSlugsMatchingSegment(
  catalogIndex: ModuleCatalogIndex | null | undefined,
  segment: string,
): Set<string> {
  const matches = new Set<string>();
  if (!catalogIndex) {
    return matches;
  }
  for (const entry of catalogIndex.bySlug.values()) {
    if (catalogSlugMatchesRouteSegment(entry.slug, segment)) {
      addSlugWithVariants(matches, entry.slug);
    }
  }
  return matches;
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
    addSlugWithVariants(candidates, options.catalogModuleSlug);
  }

  const segment = inferRoutePathSegmentAfterPrefix(route, options?.routePrefix);
  if (segment) {
    addSlugWithVariants(candidates, segment);
    for (const slug of catalogSlugsMatchingSegment(options?.catalogIndex, segment)) {
      candidates.add(slug);
    }
  }

  return [...candidates];
}

/** L2 product keys whose resource segment grants shell nav (e.g. `visitpad-master:visitpad:view`). */
const PRODUCT_WIDE_NAV_RESOURCES = new Set(['visitpad']);

const VISITPAD_MASTER_SHELL_NAV_ACTIONS = ['read', 'manage', 'create', 'update', 'delete'] as const;

/**
 * L1 product shell keys (`configurator:shell:access`, `master-data:shell:access`, …)
 * grant navigation for routes under that product without per-L2 catalog keys.
 *
 * `master-data:shell:access` does **not** grant Visitpad catalog routes or the
 * `visitpad-master` nav group — those require `visitpad-master:*` shell/catalog keys or L3 keys.
 */
/** L1 product of a well-formed `<product>:shell:access` key, else null. */
function shellAccessKeyL1(rawKey: string): string | null {
  const parts = normalizeCapabilityKey(rawKey).split(':');
  if (parts.length !== 3 || parts[1] !== 'shell' || parts[2] !== 'access') {
    return null;
  }
  return parts[0] || null;
}

/** True when any product slug (or its variant) fuzzy-matches the given L1 segment. */
function anyProductSlugMatchesL1(catalogProductSlugs: readonly string[], l1: string): boolean {
  for (const productSlug of catalogProductSlugs) {
    if (catalogSlugMatchesRouteSegment(productSlug, l1)) {
      return true;
    }
    for (const variant of catalogSlugVariants(productSlug)) {
      if (catalogSlugMatchesRouteSegment(variant, l1)) {
        return true;
      }
    }
  }
  return false;
}

export function principalHasL1ProductShellAccess(
  capabilityKeys: ReadonlySet<string>,
  catalogProductSlugs: readonly string[],
  route?: string,
): boolean {
  if (catalogProductSlugs.length === 0) {
    return false;
  }

  const isVisitpadRoute =
    route != null && (route === '/visitpad' || route.startsWith('/visitpad/'));
  const visitpadMasterNavContext = catalogProductSlugs.some((slug) =>
    catalogSlugMatchesRouteSegment(slug, 'visitpad-master'),
  );
  // `master-data:shell:access` must not authorize Visitpad routes or the
  // `visitpad-master` nav group — only `visitpad-master:*` keys do.
  const masterDataBlockedForVisitpad =
    isVisitpadRoute || (visitpadMasterNavContext && route == null);

  for (const rawKey of capabilityKeys) {
    const l1 = shellAccessKeyL1(rawKey);
    if (!l1) {
      continue;
    }
    if (masterDataBlockedForVisitpad && catalogSlugMatchesRouteSegment(l1, 'master-data')) {
      continue;
    }
    if (anyProductSlugMatchesL1(catalogProductSlugs, l1)) {
      return true;
    }
  }

  return false;
}

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

  // `conversions` is independently gated by its own catalog L2 slug
  // (`unit-conversions:*`); a product-wide `visitpad-master` shell key must not
  // blanket-grant it. The precise L2 gate upstream still grants it to real holders.
  const leafSegment = inferRoutePathSegmentAfterPrefix(route, '/visitpad');
  if (leafSegment?.toLowerCase() === 'conversions') {
    return false;
  }

  const visitpadProducts = productSlugs.filter((slug) =>
    catalogSlugMatchesRouteSegment(slug, 'visitpad-master'),
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
 * Explicit `requiredCapabilities*` declarations on the node.
 * Returns a concrete grant decision, or null when the node declares no explicit
 * capabilities (so the caller falls through to route/product gating).
 */
function evaluateDeclaredCapabilities(
  input: NavCapabilityAccessInput,
  node: NavigationNode,
  productSlugs: readonly string[],
): boolean | null {
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

  return null;
}

/**
 * Module index routes (no L2 path segment): granted by any L2+ key under the L1
 * product, by the route-prefix slug, or when the node is entirely ungated.
 */
function grantsModuleIndexRoute(
  input: NavCapabilityAccessInput,
  node: NavigationNode,
  productSlugs: readonly string[],
  routePrefix: string | undefined,
): boolean {
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
  return (
    !node.requiredCapabilities?.length &&
    !node.requiredCapabilitiesAll?.length &&
    productSlugs.length === 0
  );
}

/** Access decision for a node that has a concrete `route`. */
function grantsRoutedNode(
  input: NavCapabilityAccessInput,
  node: NavigationNode & { route: string },
  productSlugs: readonly string[],
  routePrefixOverride: string | undefined,
): boolean {
  const routePrefix = routePrefixOverride ?? inferRoutePrefixFromRoute(node.route);
  const pathSegment = inferRoutePathSegmentAfterPrefix(node.route, routePrefix);

  // Inventory subtree: routes under the inventory prefix grant on any capability in
  // the inventory product subtree (transfers, indents, GRN, etc.), not just the exact leaf.
  if (
    node.route === INVENTORY_ROUTE_PREFIX ||
    node.route.startsWith(`${INVENTORY_ROUTE_PREFIX}/`)
  ) {
    const inventoryModuleSlugs = resolveCatalogModuleSlugsForNavRoute(node.route, {
      routePrefix: INVENTORY_ROUTE_PREFIX,
      catalogModuleSlug: node.catalogModuleSlug,
      catalogIndex: input.catalogIndex,
    });
    return principalGrantsProductSubtreeRouteAccess(input.capabilityKeys, {
      productSlugs: INVENTORY_CATALOG_PRODUCT_SLUGS,
      routeModuleSlugs: inventoryModuleSlugs,
      route: node.route,
    });
  }

  const moduleSlugs = resolveCatalogModuleSlugsForNavRoute(node.route, {
    routePrefix,
    catalogModuleSlug: node.catalogModuleSlug,
    catalogIndex: input.catalogIndex,
  });

  if (principalGrantsCatalogModuleSlugRouteAccess(input.capabilityKeys, moduleSlugs)) {
    return true;
  }
  if (principalGrantsVisitpadMasterShellLeafNav(input.capabilityKeys, node.route, productSlugs)) {
    return true;
  }
  if (principalHasL1ProductShellAccess(input.capabilityKeys, productSlugs, node.route)) {
    return true;
  }
  if (!pathSegment) {
    return grantsModuleIndexRoute(input, node, productSlugs, routePrefix);
  }
  return false;
}

/** Access decision for a node with no route (a nav group). */
function grantsNavGroup(
  input: NavCapabilityAccessInput,
  node: NavigationNode,
  productSlugs: readonly string[],
): boolean {
  // Visitpad Master nav group: `master-data:shell:access` alone must not show the catalog tree.
  if (node.id === 'visitpad-master') {
    return (
      principalGrantsVisitpadMasterShellLeafNav(
        input.capabilityKeys,
        '/visitpad',
        ['visitpad-master'],
      ) ||
      input.hasAnyCapabilityForProduct?.(['visitpad-master']) === true
    );
  }

  // Other nav groups: visible when product-level access exists; leaves are pruned separately.
  if (productSlugs.length) {
    return (
      input.hasAnyCapabilityForProduct?.(productSlugs) === true ||
      principalHasL1ProductShellAccess(input.capabilityKeys, productSlugs, undefined)
    );
  }

  return false;
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

  const declared = evaluateDeclaredCapabilities(input, node, productSlugs);
  if (declared !== null) {
    return declared;
  }

  if (node.route) {
    return grantsRoutedNode(
      input,
      node as NavigationNode & { route: string },
      productSlugs,
      options?.routePrefix,
    );
  }

  return grantsNavGroup(input, node, productSlugs);
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
