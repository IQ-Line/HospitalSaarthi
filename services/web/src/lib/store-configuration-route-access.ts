import {
  assertInventorySupplyMastersTenantAdmin,
  isInventorySupplyMastersTenantAdminPrincipal,
} from '@/features/inventory-masters/lib/inventory-masters-access';
import { requireCatalogRouteAccess } from '@/lib/require-catalog-route-access';

export function assertStoreConfigurationTenantAdmin(): void {
  assertInventorySupplyMastersTenantAdmin();
}

export function isStoreConfigurationTenantAdminPrincipal(): boolean {
  return isInventorySupplyMastersTenantAdminPrincipal();
}

export function requireStoreConfigurationAccess() {
  return () => {
    assertStoreConfigurationTenantAdmin();
    if (isStoreConfigurationTenantAdminPrincipal()) {
      return;
    }
    requireCatalogRouteAccess('/store-configuration', {
      catalogProductSlugs: ['store-config'],
      routePrefix: '/store-configuration',
      catalogModuleSlug: 'store-config',
    })();
  };
}
