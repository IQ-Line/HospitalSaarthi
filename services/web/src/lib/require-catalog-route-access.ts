import { redirect } from '@tanstack/react-router';
import {
  principalGrantsCatalogRouteAccess,
  type CatalogRouteAccessOptions,
} from '@/lib/catalog-route-access';
import { resolveNavigationCapabilityBypass } from '@/lib/resolve-nav-bypass';
import { usePermissionsStore } from '@/stores/permissions.store';

export type RequireCatalogRouteAccessOptions = CatalogRouteAccessOptions & {
  redirectTo?: string;
};

/**
 * TanStack Router `beforeLoad`: catalog-driven access from hydrated principal keys.
 */
export function requireCatalogRouteAccess(
  route: string,
  options?: RequireCatalogRouteAccessOptions,
): () => void {
  return () => {
    if (resolveNavigationCapabilityBypass()) {
      return;
    }
    const capabilityKeys = usePermissionsStore.getState().capabilityKeys;
    const granted = principalGrantsCatalogRouteAccess(capabilityKeys, route, options);
    if (!granted) {
      throw redirect({ to: options?.redirectTo ?? '/dashboard' });
    }
  };
}
