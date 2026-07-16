import { useMemo } from 'react';
import {
  catalogModuleCrudAccess,
  tenantAdminInventoryMasterCrudAccess,
  type CatalogModuleCrudAccess,
  type CatalogModuleCrudAccessOptions,
} from '@/lib/catalog-module-crud-access';
import { isInventorySupplyMastersTenantAdminPrincipal } from '@/features/inventory-masters/lib/inventory-masters-access';
import { usePermissionsStore } from '@/stores/permissions.store';
import { useTenantStore } from '@/stores/tenant.store';

/**
 * Per-action UX gates for a Master Data catalog module (`modules.slug` on L2+ rows).
 * Use the manifest `catalogModuleSlug` — never hardcode full runtime capability keys in pages.
 */
export function useCatalogModuleCrud(
  catalogModuleSlug: string,
  options?: CatalogModuleCrudAccessOptions,
): CatalogModuleCrudAccess {
  const capabilityKeys = usePermissionsStore((s) => s.capabilityKeys);
  const tenantId = useTenantStore((s) => s.tenantId);
  const homeTenantId = useTenantStore((s) => s.homeTenantId);
  const isInventoryCatalogAdmin = isInventorySupplyMastersTenantAdminPrincipal();

  return useMemo(() => {
    if (
      isInventoryCatalogAdmin &&
      (tenantAdminInventoryMasterCrudAccess(catalogModuleSlug) ||
        catalogModuleSlug.trim().toLowerCase() === 'store-config')
    ) {
      return {
        canRead: true,
        canCreate: true,
        canUpdate: true,
        canDelete: true,
        canMutate: true,
      };
    }
    return catalogModuleCrudAccess(capabilityKeys, catalogModuleSlug, options);
  }, [
    capabilityKeys,
    catalogModuleSlug,
    options?.productModuleSlug,
    isInventoryCatalogAdmin,
    tenantId,
    homeTenantId,
  ]);
}
