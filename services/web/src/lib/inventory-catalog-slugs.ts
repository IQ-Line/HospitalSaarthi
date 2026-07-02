import {
  principalGrantsCatalogModuleSlugRouteAccess,
  principalHasCatalogModuleAction,
} from '@/lib/catalog-route-access';
import { catalogSlugVariants } from '@/platform/modules/catalog-slug-variants';

/**
 * Inventory reference-master L3 catalog slugs (seeded in master-data migration 044).
 * Item Master uses the L2 `inventory-master` slug — see item-master tab access rules.
 */
export const INVENTORY_MASTER_L3_CATALOG_SLUGS = [
  'inventory-categories',
  'inventory-item-types',
  'inventory-uoms',
  'inventory-hsn-gst',
  'inventory-storage-conditions',
  'inventory-store-types',
] as const;

function buildInventoryL3CatalogSlugSet(): ReadonlySet<string> {
  const set = new Set<string>();
  for (const slug of INVENTORY_MASTER_L3_CATALOG_SLUGS) {
    set.add(slug.toLowerCase());
    for (const variant of catalogSlugVariants(slug)) {
      set.add(variant.toLowerCase());
    }
  }
  return set;
}

export const INVENTORY_L3_CATALOG_SLUG_SET = buildInventoryL3CatalogSlugSet();

export function isInventoryL3CatalogModuleSlug(catalogModuleSlug: string): boolean {
  const slug = catalogModuleSlug.trim().toLowerCase();
  return slug.length > 0 && INVENTORY_L3_CATALOG_SLUG_SET.has(slug);
}

/** True when the principal can open at least one inventory reference-master L3 leaf. */
export function principalHasAnyInventoryMasterL3RouteAccess(
  capabilityKeys: ReadonlySet<string>,
): boolean {
  return principalGrantsCatalogModuleSlugRouteAccess(
    capabilityKeys,
    INVENTORY_MASTER_L3_CATALOG_SLUGS,
  );
}

/** True when the principal holds `<l3-slug>:<l3-slug>:<action>` on any inventory L3 master. */
export function principalHasAnyInventoryMasterL3Action(
  capabilityKeys: ReadonlySet<string>,
  action: 'read' | 'create' | 'update' | 'delete',
): boolean {
  for (const slug of INVENTORY_MASTER_L3_CATALOG_SLUGS) {
    if (principalHasCatalogModuleAction(capabilityKeys, slug, action)) {
      return true;
    }
  }
  return false;
}
