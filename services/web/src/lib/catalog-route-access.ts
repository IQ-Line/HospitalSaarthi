import {
  buildNavCapabilityAccessInput,
  capabilityKeysGrantModuleSlugAccess,
  principalGrantsNavNodeAccess,
} from '@/navigation/nav-capability-access';
import { capabilityKeysGrantProductAccess } from '@/navigation/module-product-access';
import { getModuleCatalogIndexFromCache } from '@/platform/modules/module-catalog';
import { normalizeCapabilityKey } from '@/lib/principal-capabilities';
import { catalogSlugVariants } from '@/platform/modules/catalog-slug-variants';
import type { NavigationNode } from '@/navigation/types';

/** Actions that authorize opening a catalog L2+ leaf route or list page (UX gate). */
export const CATALOG_MODULE_ROUTE_ACCESS_ACTIONS = [
  'read',
  'create',
  'update',
  'delete',
  'manage',
] as const;

export type CatalogRouteAccessOptions = {
  catalogModuleSlug?: string;
  catalogProductSlugs?: readonly string[];
  routePrefix?: string;
};

/**
 * Route / nav gate from principal capability keys and catalog module slugs (no shell-key bypass).
 */
export function principalGrantsCatalogRouteAccess(
  capabilityKeys: ReadonlySet<string>,
  route: string,
  options?: CatalogRouteAccessOptions,
): boolean {
  const catalogProductSlugs = options?.catalogProductSlugs ?? [];
  const catalogIndex = getModuleCatalogIndexFromCache();
  const hasAnyCapabilityForProduct = (slugs: readonly string[]) =>
    capabilityKeysGrantProductAccess(capabilityKeys, slugs, catalogIndex);

  const access = buildNavCapabilityAccessInput(
    capabilityKeys,
    catalogIndex,
    false,
    hasAnyCapabilityForProduct,
  );

  const node: NavigationNode = {
    id: 'route-gate',
    label: route,
    route,
    catalogModuleSlug: options?.catalogModuleSlug,
    ...(catalogProductSlugs.length > 0 ? { requiredModulesAny: catalogProductSlugs } : {}),
  };

  return principalGrantsNavNodeAccess(access, node, {
    parentProductSlugs: catalogProductSlugs,
    routePrefix: options?.routePrefix,
  });
}

/** True when principal holds `<moduleSlug>:*:<action>` (catalog L2+ vocabulary). */
export function principalHasCatalogModuleAction(
  capabilityKeys: ReadonlySet<string>,
  moduleSlug: string,
  action: string,
): boolean {
  const normalizedAction = action.trim().toLowerCase();
  const segments = new Set<string>();

  for (const rawKey of capabilityKeys) {
    const parts = normalizeCapabilityKey(rawKey).split(':');
    if (parts.length < 3) {
      continue;
    }
    const [l1, resource, act] = parts;
    if (!l1 || !resource || !act || act !== normalizedAction) {
      continue;
    }
    for (const segment of [l1, resource]) {
      segments.add(segment);
      for (const variant of catalogSlugVariants(segment)) {
        segments.add(variant);
      }
    }
  }

  return capabilityKeysGrantModuleSlugAccess(segments, [moduleSlug]);
}

/**
 * Leaf catalog routes require an explicit L2+ action on the resolved module slug(s).
 * Module segment presence alone (e.g. from unrelated actions) is not sufficient.
 */
export function principalGrantsCatalogModuleSlugRouteAccess(
  capabilityKeys: ReadonlySet<string>,
  moduleSlugs: readonly string[],
): boolean {
  if (moduleSlugs.length === 0) {
    return false;
  }

  for (const slug of moduleSlugs) {
    for (const action of CATALOG_MODULE_ROUTE_ACCESS_ACTIONS) {
      if (principalHasCatalogModuleAction(capabilityKeys, slug, action)) {
        return true;
      }
    }
  }

  return false;
}
