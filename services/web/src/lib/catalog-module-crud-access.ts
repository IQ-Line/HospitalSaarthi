/* eslint-disable no-restricted-syntax --
 * This is THE sanctioned, centralized catalog CRUD-access resolver: a pure (non-React) lib
 * below the hook layer. The web-wide can* ban exists to push COMPONENTS toward useCapability /
 * CapabilityGate, but those are React hooks that cannot run here — this file is the very
 * implementation those hooks (useCatalogModuleAction / useCatalogModuleCrud) resolve through, so
 * its can* locals ARE the canonical computation the rule directs components to delegate to.
 * Renaming them to dodge the regex would be metric-gaming and obscure the clearest names.
 * (No legacy permission-map call or can* helper-function lives here; if one is added, re-scope this.)
 */
import { principalHasCatalogModuleAction } from '@/lib/catalog-route-access';
import {
  principalHasAnyInventoryMasterL3Action,
  principalHasAnyInventoryMasterL3RouteAccess,
} from '@/lib/inventory-catalog-slugs';
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
type MutableCatalogCrud = {
  canRead: boolean;
  canCreate: boolean;
  canUpdate: boolean;
  canDelete: boolean;
};

/** Visitpad-master shell keys (also used for `departments`) grant read + full mutate. */
function applyVisitpadMasterShell(capabilityKeys: ReadonlySet<string>, acc: MutableCatalogCrud): void {
  const shell = visitpadMasterShellCrudAccess(capabilityKeys);
  acc.canRead = acc.canRead || shell.canRead;
  if (shell.canMutate) {
    acc.canCreate = true;
    acc.canUpdate = true;
    acc.canDelete = true;
  }
}

/** Inventory-master rolls up its L3 catalog route/action grants. */
function applyInventoryMasterShell(capabilityKeys: ReadonlySet<string>, acc: MutableCatalogCrud): void {
  acc.canRead =
    acc.canRead ||
    principalHasAnyInventoryMasterL3RouteAccess(capabilityKeys) ||
    principalHasAnyInventoryMasterL3Action(capabilityKeys, 'read');
  if (principalHasAnyInventoryMasterL3Action(capabilityKeys, 'create')) acc.canCreate = true;
  if (principalHasAnyInventoryMasterL3Action(capabilityKeys, 'update')) acc.canUpdate = true;
  if (principalHasAnyInventoryMasterL3Action(capabilityKeys, 'delete')) acc.canDelete = true;
}

export function catalogModuleCrudAccess(
  capabilityKeys: ReadonlySet<string>,
  catalogModuleSlug: string,
  options?: CatalogModuleCrudAccessOptions,
): CatalogModuleCrudAccess {
  const acc: MutableCatalogCrud = {
    canRead:
      principalHasCatalogModuleAction(capabilityKeys, catalogModuleSlug, 'read') ||
      (options?.productModuleSlug
        ? principalHasCatalogModuleAction(capabilityKeys, options.productModuleSlug, 'access')
        : false),
    canCreate: principalHasCatalogModuleAction(capabilityKeys, catalogModuleSlug, 'create'),
    canUpdate: principalHasCatalogModuleAction(capabilityKeys, catalogModuleSlug, 'update'),
    canDelete: principalHasCatalogModuleAction(capabilityKeys, catalogModuleSlug, 'delete'),
  };

  if (isVisitpadL3CatalogModuleSlug(catalogModuleSlug) || catalogModuleSlug === 'departments') {
    applyVisitpadMasterShell(capabilityKeys, acc);
  }

  /** Desk staff with create/update must see the OPD registration list (read is not always assigned separately). */
  if (catalogModuleSlug === 'registration' && (acc.canCreate || acc.canUpdate)) {
    acc.canRead = true;
  }

  if (catalogModuleSlug === 'inventory-master') {
    applyInventoryMasterShell(capabilityKeys, acc);
  }

  return {
    canRead: acc.canRead,
    canCreate: acc.canCreate,
    canUpdate: acc.canUpdate,
    canDelete: acc.canDelete,
    canMutate: acc.canCreate || acc.canUpdate || acc.canDelete,
  };
}
