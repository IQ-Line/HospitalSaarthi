import { principalHasCatalogModuleAction } from '@/lib/catalog-route-access';

export type CatalogModuleCrudAction = 'read' | 'create' | 'update' | 'delete' | 'access';

export type CatalogModuleCrudAccess = {
  canRead: boolean;
  canCreate: boolean;
  canUpdate: boolean;
  canDelete: boolean;
  /** Any of create, update, or delete (e.g. bulk import tools). */
  canMutate: boolean;
};

export type CatalogModuleCrudAccessOptions = {
  /**
   * L1 product module slug (e.g. `frontdesk`, `billing-and-finance`).
   * Grants **read/navigation** via `*:shell:access` only — never create/update/delete.
   */
  productModuleSlug?: string;
};

/**
 * UX gates for Master Data L2+ catalog modules.
 * Matches runtime keys synced from `module_permissions` (`<slug>:<resource>:<action>`).
 */
export function catalogModuleCrudAccess(
  capabilityKeys: ReadonlySet<string>,
  catalogModuleSlug: string,
  options?: CatalogModuleCrudAccessOptions,
): CatalogModuleCrudAccess {
  const canCreate = principalHasCatalogModuleAction(
    capabilityKeys,
    catalogModuleSlug,
    'create',
  );
  const canUpdate = principalHasCatalogModuleAction(
    capabilityKeys,
    catalogModuleSlug,
    'update',
  );
  const canDelete = principalHasCatalogModuleAction(
    capabilityKeys,
    catalogModuleSlug,
    'delete',
  );
  const canRead =
    principalHasCatalogModuleAction(capabilityKeys, catalogModuleSlug, 'read') ||
    (options?.productModuleSlug
      ? principalHasCatalogModuleAction(capabilityKeys, options.productModuleSlug, 'access')
      : false);

  return {
    canRead,
    canCreate,
    canUpdate,
    canDelete,
    canMutate: canCreate || canUpdate || canDelete,
  };
}
