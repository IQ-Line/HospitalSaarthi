import { principalGrantsCatalogRouteAccess } from '@/lib/catalog-route-access';
import { visitpadModuleManifest } from '@/platform/modules/manifests/visitpad.manifest';

const VISITPAD_PRODUCT_SLUGS = ['visitpad-templates'] as const;

/** First Visitpad leaf route the principal may open (manifest order). */
export function firstAccessibleVisitpadPath(capabilityKeys: ReadonlySet<string>): string | null {
  for (const node of visitpadModuleManifest.navigation) {
    if (!node.route) {
      continue;
    }
    if (
      principalGrantsCatalogRouteAccess(capabilityKeys, node.route, {
        catalogProductSlugs: VISITPAD_PRODUCT_SLUGS,
        routePrefix: visitpadModuleManifest.routePrefix,
        catalogModuleSlug: node.catalogModuleSlug,
      })
    ) {
      return node.route;
    }
  }
  return null;
}
