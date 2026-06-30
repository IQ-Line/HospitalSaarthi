import { useMemo } from 'react';
import {
  catalogModuleCrudAccess,
  tenantAdminInventoryMasterCrudAccess,
  type CatalogModuleCrudAccess,
  type CatalogModuleCrudAccessOptions,
} from '@/lib/catalog-module-crud-access';
import { resolveTenantAdmin } from '@/lib/platform-admin';
import { useAuthStore } from '@/stores/auth.store';
import { usePermissionsStore } from '@/stores/permissions.store';

/**
 * Per-action UX gates for a Master Data catalog module (`modules.slug` on L2+ rows).
 * Use the manifest `catalogModuleSlug` — never hardcode full runtime capability keys in pages.
 */
export function useCatalogModuleCrud(
  catalogModuleSlug: string,
  options?: CatalogModuleCrudAccessOptions,
): CatalogModuleCrudAccess {
  const capabilityKeys = usePermissionsStore((s) => s.capabilityKeys);
  const authRoles = useAuthStore((s) => s.roles);
  const principalRoles = usePermissionsStore((s) => s.roles);
  const accessToken = useAuthStore((s) => s.accessToken);
  const isTenantAdmin = resolveTenantAdmin({ principalRoles, authRoles, accessToken });

  return useMemo(() => {
    if (isTenantAdmin && tenantAdminInventoryMasterCrudAccess(catalogModuleSlug)) {
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
    isTenantAdmin,
  ]);
}
