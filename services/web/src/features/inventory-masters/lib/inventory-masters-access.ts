import { redirect } from '@tanstack/react-router';
import { principalGrantsCatalogRouteAccess } from '@/lib/catalog-route-access';
import {
  INVENTORY_MASTER_DEFAULT_ROUTE,
  INVENTORY_MASTER_TABS,
} from '@/features/inventory-masters/inventory-masters-nav-model';
import type { InventoryMasterTabId } from '@/features/inventory-masters/types';
import { isOperatingAsFacilityTenant } from '@/lib/facility-tenant-scope';
import { resolvePlatformSuperAdmin, resolveTenantAdmin } from '@/lib/platform-admin';
import { useAuthStore } from '@/stores/auth.store';
import { usePermissionsStore } from '@/stores/permissions.store';
import { useTenantStore } from '@/stores/tenant.store';

export const INVENTORY_MASTER_CATALOG_PRODUCT_SLUGS = ['inventory-master'] as const;
export const INVENTORY_MASTER_ROUTE_PREFIX = '/inventory-supply-masters';

export function assertInventorySupplyMastersTenantAdmin(): void {
  const authRoles = useAuthStore.getState().roles;
  const principalRoles = usePermissionsStore.getState().roles;
  const accessToken = useAuthStore.getState().accessToken;
  const principal = { principalRoles, authRoles, accessToken };
  if (resolveTenantAdmin(principal)) {
    return;
  }
  if (resolvePlatformSuperAdmin(principal)) {
    const { homeTenantId, tenantId } = useTenantStore.getState();
    if (
      !isOperatingAsFacilityTenant({
        isPlatformSuperAdmin: true,
        homeTenantId,
        activeTenantId: tenantId,
      })
    ) {
      // Tenant-scoped — select a facility from Onboarding first.
      throw redirect({ to: '/configurator/tenant' });
    }
    return;
  }
  throw redirect({ to: '/dashboard' });
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

/**
 * Full inventory-masters / store-config admin UX without L3 capability keys.
 * Tenant-admins always; platform super-admins only while operating as a facility tenant.
 */
export function isInventorySupplyMastersTenantAdminPrincipal(): boolean {
  const authRoles = useAuthStore.getState().roles;
  const principalRoles = usePermissionsStore.getState().roles;
  const accessToken = useAuthStore.getState().accessToken;
  const principal = { principalRoles, authRoles, accessToken };
  if (resolveTenantAdmin(principal)) {
    return true;
  }
  if (!resolvePlatformSuperAdmin(principal)) {
    return false;
  }
  const { homeTenantId, tenantId } = useTenantStore.getState();
  return isOperatingAsFacilityTenant({
    isPlatformSuperAdmin: true,
    homeTenantId,
    activeTenantId: tenantId,
  });
}
