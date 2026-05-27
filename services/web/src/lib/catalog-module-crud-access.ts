import { principalHasCatalogModuleAction } from '@/lib/catalog-route-access';
import { canonicalizeRuntimeCapabilityKey } from '@/lib/legacy-capability-key-remap';
import { normalizeCapabilityKey } from '@/lib/principal-capabilities';
import { MD_VISITPAD_CREATE, MD_VISITPAD_VIEW } from '@/lib/runtime-capability-keys';
import { catalogSlugVariants } from '@/platform/modules/catalog-slug-variants';

/** L3 Visitpad catalog slugs (Master Data `modules.slug` under `visitpad-master`). */
const VISITPAD_L3_CATALOG_SLUGS = [
  'units',
  'unit-conversions',
  'vitals',
  'chief-complaints',
  'diagnoses',
  'allergens',
  'allergy-reactions',
  'rxcolumns',
  'medicines',
  'chronic-illnesses',
  'procedures',
  'vaccines',
  'manufacturers',
] as const;

export function isVisitpadL3CatalogModuleSlug(catalogModuleSlug: string): boolean {
  const slug = catalogModuleSlug.trim().toLowerCase();
  if (!slug) {
    return false;
  }
  for (const visitpadSlug of VISITPAD_L3_CATALOG_SLUGS) {
    if (slug === visitpadSlug) {
      return true;
    }
    for (const variant of catalogSlugVariants(visitpadSlug)) {
      if (variant === slug) {
        return true;
      }
    }
  }
  return false;
}

function principalHoldsCapabilityKey(
  capabilityKeys: ReadonlySet<string>,
  expectedKey: string,
): boolean {
  const want = canonicalizeRuntimeCapabilityKey(normalizeCapabilityKey(expectedKey));
  for (const raw of capabilityKeys) {
    if (canonicalizeRuntimeCapabilityKey(normalizeCapabilityKey(raw)) === want) {
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

  return {
    canRead,
    canCreate: mergedCreate,
    canUpdate: mergedUpdate,
    canDelete: mergedDelete,
    canMutate: mergedCreate || mergedUpdate || mergedDelete,
  };
}
