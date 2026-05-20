import { redirect } from '@tanstack/react-router';
import {
  principalGrantsCatalogRouteAccess,
  type CatalogRouteAccessOptions,
} from '@/lib/catalog-route-access';
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
    const capabilityKeys = usePermissionsStore.getState().capabilityKeys;
    if (!principalGrantsCatalogRouteAccess(capabilityKeys, route, options)) {
      throw redirect({ to: options?.redirectTo ?? '/dashboard' });
    }
  };
}
