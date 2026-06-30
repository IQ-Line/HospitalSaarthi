import { redirect } from '@tanstack/react-router';
import { principalGrantsCatalogRouteAccess } from '@/lib/catalog-route-access';
import {
  INVENTORY_MASTER_DEFAULT_ROUTE,
  INVENTORY_MASTER_TABS,
} from '@/features/inventory-masters/inventory-masters-nav-model';
import type { InventoryMasterTabId } from '@/features/inventory-masters/types';
import { resolveTenantAdmin } from '@/lib/platform-admin';
import { useAuthStore } from '@/stores/auth.store';
import { usePermissionsStore } from '@/stores/permissions.store';

export const INVENTORY_MASTER_CATALOG_PRODUCT_SLUGS = ['inventory-master'] as const;
export const INVENTORY_MASTER_ROUTE_PREFIX = '/inventory-supply-masters';

export function assertInventorySupplyMastersTenantAdmin(): void {
  const authRoles = useAuthStore.getState().roles;
  const principalRoles = usePermissionsStore.getState().roles;
  const accessToken = useAuthStore.getState().accessToken;
  if (!resolveTenantAdmin({ principalRoles, authRoles, accessToken })) {
    throw redirect({ to: '/dashboard' });
  }
}

export function principalGrantsInventoryMasterRouteAccess(
  capabilityKeys: ReadonlySet<string>,
  route: string,
  catalogModuleSlug?: string,
): boolean {
  return principalGrantsCatalogRouteAccess(capabilityKeys, route, {
    catalogProductSlugs: INVENTORY_MASTER_CATALOG_PRODUCT_SLUGS,
    routePrefix: INVENTORY_MASTER_ROUTE_PREFIX,
    catalogModuleSlug,
  });
}

export function firstAccessibleInventoryMasterPath(
  capabilityKeys: ReadonlySet<string>,
): string | null {
  for (const tab of INVENTORY_MASTER_TABS) {
    if (principalGrantsInventoryMasterRouteAccess(capabilityKeys, tab.route, tab.catalogModuleSlug)) {
      return tab.route;
    }
  }
  return null;
}

export function defaultInventoryMasterLandingPath(): string {
  return INVENTORY_MASTER_DEFAULT_ROUTE;
}

export function catalogModuleSlugForInventoryMasterTab(tabId: InventoryMasterTabId): string {
  return INVENTORY_MASTER_TABS.find((tab) => tab.id === tabId)?.catalogModuleSlug ?? 'inventory-master';
}

/** Tenant administrators manage inventory masters by role; capability keys gate delegated staff only. */
export function isInventorySupplyMastersTenantAdminPrincipal(): boolean {
  const authRoles = useAuthStore.getState().roles;
  const principalRoles = usePermissionsStore.getState().roles;
  const accessToken = useAuthStore.getState().accessToken;
  return resolveTenantAdmin({ principalRoles, authRoles, accessToken });
}
