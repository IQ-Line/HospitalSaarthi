import { VISITPAD_CATALOG_SECTIONS } from '@/lib/visitpad-catalog-slugs';

export const visitpadKeys = {
  all: ['visitpad'] as const,
  units: () => [...visitpadKeys.all, 'units'] as const,
  conversions: () => [...visitpadKeys.all, 'conversions'] as const,
  vitals: () => [...visitpadKeys.all, 'vitals'] as const,
  chiefComplaints: () => [...visitpadKeys.all, 'chief-complaints'] as const,
  diagnoses: () => [...visitpadKeys.all, 'diagnoses'] as const,
  allergens: () => [...visitpadKeys.all, 'allergens'] as const,
  reactions: () => [...visitpadKeys.all, 'reactions'] as const,
  rxColumns: (section?: string) =>
    [...visitpadKeys.all, 'rx-columns', section ?? 'all'] as const,
  medicines: () => [...visitpadKeys.all, 'medicines'] as const,
  chronicIllnesses: () => [...visitpadKeys.all, 'chronic-illnesses'] as const,
  procedures: () => [...visitpadKeys.all, 'procedures'] as const,
  vaccines: () => [...visitpadKeys.all, 'vaccines'] as const,
  manufacturers: () => [...visitpadKeys.all, 'manufacturers'] as const,
};

const tenantCatalogKeysPrefix = (listPath: string) =>
  [...visitpadKeys.all, 'tenant-catalog-keys', listPath] as const;

type VisitpadListInvalidationEntry = {
  listPath: string;
  listKey: readonly unknown[];
  listKeyPrefix?: readonly unknown[];
};

const VISITPAD_LIST_KEY_BY_PATH: Record<string, () => readonly unknown[]> = {
  '/units': visitpadKeys.units,
  '/unit-conversions': visitpadKeys.conversions,
  '/vitals': visitpadKeys.vitals,
  '/chief-complaints': visitpadKeys.chiefComplaints,
  '/diagnoses': visitpadKeys.diagnoses,
  '/allergens': visitpadKeys.allergens,
  '/allergy-reactions': visitpadKeys.reactions,
  '/rx-columns': visitpadKeys.rxColumns,
  '/medicines': visitpadKeys.medicines,
  '/chronic-illnesses': visitpadKeys.chronicIllnesses,
  '/procedures': visitpadKeys.procedures,
  '/vaccines': visitpadKeys.vaccines,
  '/manufacturers': visitpadKeys.manufacturers,
};

const VISITPAD_LIST_INVALIDATION: readonly VisitpadListInvalidationEntry[] =
  VISITPAD_CATALOG_SECTIONS.map((section) => {
    const listKey = VISITPAD_LIST_KEY_BY_PATH[section.listPath]?.() ?? [...visitpadKeys.all];
    return {
      listPath: section.listPath,
      listKey,
      ...(section.listPath === '/rx-columns'
        ? { listKeyPrefix: [...visitpadKeys.all, 'rx-columns'] as const }
        : {}),
    };
  });

/** `/api/v1/master-data/visitpad/vitals` → `/vitals`. */
export function visitpadCatalogListPathFromBasePath(basePath: string): string | null {
  const trimmed = basePath.replace(/\/+$/, '');
  const marker = '/visitpad/';
  const idx = trimmed.indexOf(marker);
  if (idx === -1) {
    return null;
  }
  const segment = trimmed.slice(idx + marker.length).split('/')[0]?.trim();
  if (!segment) {
    return null;
  }
  return `/${segment}`;
}

function visitpadInvalidationKeysForListPath(listPath: string): readonly (readonly unknown[])[] {
  const entry = VISITPAD_LIST_INVALIDATION.find((row) => row.listPath === listPath);
  if (!entry) {
    return [[...visitpadKeys.all]];
  }
  const keys: (readonly unknown[])[] = [entry.listKey, tenantCatalogKeysPrefix(listPath)];
  if (entry.listKeyPrefix) {
    keys.push(entry.listKeyPrefix);
  }
  return keys;
}

/**
 * Query keys to invalidate after POST/PATCH/DELETE on a Visitpad catalog collection.
 */
export function visitpadInvalidationKeysForCatalogBasePath(
  basePath: string,
): readonly (readonly unknown[])[] {
  const listPath = visitpadCatalogListPathFromBasePath(basePath);
  if (!listPath) {
    return [[...visitpadKeys.all]];
  }
  return visitpadInvalidationKeysForListPath(listPath);
}

/**
 * Query key roots to invalidate after `POST …/visitpad/…/import-from-platform` succeeds.
 */
export function visitpadInvalidationKeysAfterPlatformImport(
  importPath: string,
): readonly (readonly unknown[])[] {
  const pathPart = importPath.split('?')[0] ?? importPath;
  for (const entry of VISITPAD_LIST_INVALIDATION) {
    if (pathPart.endsWith(`${entry.listPath}/import-from-platform`)) {
      return visitpadInvalidationKeysForListPath(entry.listPath);
    }
  }
  return [[...visitpadKeys.all]];
}
