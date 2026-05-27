import { catalogSlugVariants } from '@/platform/modules/catalog-slug-variants';

/**
 * Visitpad L3 catalog sections — single source for invalidation paths and CRUD slug checks.
 * `listPath` is the REST segment under `/api/v1/master-data/visitpad`.
 */
export const VISITPAD_CATALOG_SECTIONS = [
  { listPath: '/units', catalogSlug: 'units' },
  { listPath: '/unit-conversions', catalogSlug: 'unit-conversions' },
  { listPath: '/vitals', catalogSlug: 'vitals' },
  { listPath: '/chief-complaints', catalogSlug: 'chief-complaints' },
  { listPath: '/diagnoses', catalogSlug: 'diagnoses' },
  { listPath: '/allergens', catalogSlug: 'allergens' },
  { listPath: '/allergy-reactions', catalogSlug: 'allergy-reactions' },
  { listPath: '/rx-columns', catalogSlug: 'rxcolumns' },
  { listPath: '/medicines', catalogSlug: 'medicines' },
  { listPath: '/chronic-illnesses', catalogSlug: 'chronic-illnesses' },
  { listPath: '/procedures', catalogSlug: 'procedures' },
  { listPath: '/vaccines', catalogSlug: 'vaccines' },
  { listPath: '/manufacturers', catalogSlug: 'manufacturers' },
] as const;

export type VisitpadCatalogListPath = (typeof VISITPAD_CATALOG_SECTIONS)[number]['listPath'];

function buildVisitpadL3CatalogSlugSet(): ReadonlySet<string> {
  const set = new Set<string>();
  for (const { catalogSlug } of VISITPAD_CATALOG_SECTIONS) {
    set.add(catalogSlug.toLowerCase());
    for (const variant of catalogSlugVariants(catalogSlug)) {
      set.add(variant.toLowerCase());
    }
  }
  return set;
}

/** O(1) lookup for Visitpad L3 `modules.slug` values (includes hyphen/plural variants). */
export const VISITPAD_L3_CATALOG_SLUG_SET = buildVisitpadL3CatalogSlugSet();

export function isVisitpadL3CatalogModuleSlug(catalogModuleSlug: string): boolean {
  const slug = catalogModuleSlug.trim().toLowerCase();
  return slug.length > 0 && VISITPAD_L3_CATALOG_SLUG_SET.has(slug);
}

export function visitpadCatalogListPathForSlug(catalogSlug: string): string | null {
  const normalized = catalogSlug.trim().toLowerCase();
  for (const section of VISITPAD_CATALOG_SECTIONS) {
    if (section.catalogSlug === normalized) {
      return section.listPath;
    }
    for (const variant of catalogSlugVariants(section.catalogSlug)) {
      if (variant === normalized) {
        return section.listPath;
      }
    }
  }
  return null;
}
