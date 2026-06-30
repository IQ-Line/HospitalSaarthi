import { principalHasCatalogModuleAction } from '@/lib/catalog-route-access';
import { normalizeCapabilityKey } from '@/lib/principal-capabilities';
import { MD_SHELL_ACCESS, MD_VISITPAD_CREATE, MD_VISITPAD_VIEW } from '@/lib/runtime-capability-keys';
import { isVisitpadL3CatalogModuleSlug } from '@/lib/visitpad-catalog-slugs';

function principalHoldsCapabilityKey(
  capabilityKeys: ReadonlySet<string>,
  expectedKey: string,
): boolean {
  const want = normalizeCapabilityKey(expectedKey);
  for (const raw of capabilityKeys) {
    if (normalizeCapabilityKey(raw) === want) {
      return true;
    }
  }
  return false;
}

/**
 * Demo / tenant-admin shell keys on L2 `visitpad-master` (`visitpad.view` / `visitpad.create`
 * from Master Data seed) — authorize all Visitpad L3 catalog UX when L3 keys are not assigned.
 */
function visitpadMasterShellCrudAccess(capabilityKeys: ReadonlySet<string>): {
  canRead: boolean;
  canMutate: boolean;
} {
  const canRead =
    principalHoldsCapabilityKey(capabilityKeys, MD_VISITPAD_VIEW) ||
    principalHasCatalogModuleAction(capabilityKeys, 'visitpad-master', 'read');
  const canMutate =
    principalHoldsCapabilityKey(capabilityKeys, MD_VISITPAD_CREATE) ||
    principalHasCatalogModuleAction(capabilityKeys, 'visitpad-master', 'create') ||
    principalHasCatalogModuleAction(capabilityKeys, 'visitpad-master', 'update') ||
    principalHasCatalogModuleAction(capabilityKeys, 'visitpad-master', 'delete');
  return { canRead, canMutate };
}

/** Tenant admins with Master Data shell access manage inventory reference catalogs. */
function masterDataShellCrudAccess(capabilityKeys: ReadonlySet<string>): {
  canRead: boolean;
  canMutate: boolean;
} {
  const canAccess = principalHoldsCapabilityKey(capabilityKeys, MD_SHELL_ACCESS);
  return { canRead: canAccess, canMutate: canAccess };
}

const INVENTORY_MASTER_CATALOG_SLUGS = new Set([
  'inventory-master',
  'inventory-categories',
  'inventory-item-types',
  'inventory-uoms',
  'inventory-hsn-gst',
  'inventory-storage-conditions',
  'inventory-store-types',
]);

function isInventoryMasterCatalogSlug(catalogModuleSlug: string): boolean {
  const slug = catalogModuleSlug.trim().toLowerCase();
  return INVENTORY_MASTER_CATALOG_SLUGS.has(slug);
}

/** Full CRUD for tenant administrators on inventory reference catalog screens. */
export function tenantAdminInventoryMasterCrudAccess(catalogModuleSlug: string): boolean {
  return isInventoryMasterCatalogSlug(catalogModuleSlug);
}

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
  let canRead =
    principalHasCatalogModuleAction(capabilityKeys, catalogModuleSlug, 'read') ||
    (options?.productModuleSlug
      ? principalHasCatalogModuleAction(capabilityKeys, options.productModuleSlug, 'access')
      : false);

  let mergedCreate = canCreate;
  let mergedUpdate = canUpdate;
  let mergedDelete = canDelete;

  if (isVisitpadL3CatalogModuleSlug(catalogModuleSlug)) {
    const shell = visitpadMasterShellCrudAccess(capabilityKeys);
    canRead = canRead || shell.canRead;
    if (shell.canMutate) {
      mergedCreate = true;
      mergedUpdate = true;
      mergedDelete = true;
    }
  }

  if (catalogModuleSlug === 'departments') {
    const shell = visitpadMasterShellCrudAccess(capabilityKeys);
    canRead = canRead || shell.canRead;
    if (shell.canMutate) {
      mergedCreate = true;
      mergedUpdate = true;
      mergedDelete = true;
    }
  }

  if (isInventoryMasterCatalogSlug(catalogModuleSlug)) {
    const shell = masterDataShellCrudAccess(capabilityKeys);
    canRead = canRead || shell.canRead;
    if (shell.canMutate) {
      mergedCreate = true;
      mergedUpdate = true;
      mergedDelete = true;
    }
  }

  return {
    canRead,
    canCreate: mergedCreate,
    canUpdate: mergedUpdate,
    canDelete: mergedDelete,
    canMutate: mergedCreate || mergedUpdate || mergedDelete,
  };
}
