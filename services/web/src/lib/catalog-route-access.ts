import {
  buildNavCapabilityAccessInput,
  catalogSlugMatchesRouteSegment,
  principalGrantsNavNodeAccess,
} from '@/navigation/nav-capability-access';
import { capabilityKeysGrantProductAccess } from '@/navigation/module-product-access';
import { getModuleCatalogIndexFromCache } from '@/platform/modules/module-catalog';
import { canonicalizeRuntimeCapabilityKey } from '@/lib/legacy-capability-key-remap';
import { normalizeCapabilityKey } from '@/lib/principal-capabilities';
import type { NavigationNode } from '@/navigation/types';

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
  for (const rawKey of capabilityKeys) {
    const parts = canonicalizeRuntimeCapabilityKey(normalizeCapabilityKey(rawKey)).split(':');
    if (parts.length < 3) {
      continue;
    }
    const [l1, resource, act] = parts;
    if (!l1 || !resource || !act || act !== normalizedAction) {
      continue;
    }
    if (
      catalogSlugMatchesRouteSegment(moduleSlug, l1) ||
      catalogSlugMatchesRouteSegment(moduleSlug, resource)
    ) {
      return true;
    }
  }
  return false;
}
