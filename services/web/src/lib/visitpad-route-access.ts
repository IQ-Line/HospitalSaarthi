import { redirect } from '@tanstack/react-router';
import { principalGrantsCatalogRouteAccess } from '@/lib/catalog-route-access';
import { firstAccessibleVisitpadPath } from '@/lib/visitpad-default-route';
import { resolveNavigationCapabilityBypass } from '@/lib/resolve-nav-bypass';
import { usePermissionsStore } from '@/stores/permissions.store';
import {
  catalogModuleSlugForVisitpadManifestNode,
  firstAccessibleVisitpadPathInPrimaryTab,
  getVisitpadManifestNodeByRoute,
  VISITPAD_CATALOG_PRODUCT_SLUGS,
  VISITPAD_ROUTE_PREFIX,
  visitpadPrimaryTabForRoute,
} from '@/features/visitpad/lib/visitpad-access';

/** TanStack Router guard for a Visitpad leaf route (catalog L2 capabilities only). */
export function requireVisitpadLeafRouteAccess(route: string, catalogModuleSlug?: string) {
  const manifestNode = getVisitpadManifestNodeByRoute(route);
  const resolvedCatalogModuleSlug =
    catalogModuleSlug ??
    (manifestNode ? catalogModuleSlugForVisitpadManifestNode(manifestNode.id) : undefined);

  return () => {
    if (resolveNavigationCapabilityBypass()) {
      return;
    }
    const capabilityKeys = usePermissionsStore.getState().capabilityKeys;
    if (
      principalGrantsCatalogRouteAccess(capabilityKeys, route, {
        catalogProductSlugs: VISITPAD_CATALOG_PRODUCT_SLUGS,
        routePrefix: VISITPAD_ROUTE_PREFIX,
        catalogModuleSlug: resolvedCatalogModuleSlug,
      })
    ) {
      return;
    }

    const tabId = visitpadPrimaryTabForRoute(route);
    const redirectTo =
      (tabId ? firstAccessibleVisitpadPathInPrimaryTab(capabilityKeys, tabId) : null) ??
      firstAccessibleVisitpadPath(capabilityKeys) ??
      '/dashboard';
    throw redirect({ to: redirectTo });
  };
}
