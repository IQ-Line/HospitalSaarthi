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
  /** Prefix for rx-columns (all sections). */
  listKeyPrefix?: readonly unknown[];
};

const VISITPAD_LIST_INVALIDATION: readonly VisitpadListInvalidationEntry[] = [
  { listPath: '/units', listKey: visitpadKeys.units() },
  { listPath: '/unit-conversions', listKey: visitpadKeys.conversions() },
  { listPath: '/vitals', listKey: visitpadKeys.vitals() },
  { listPath: '/chief-complaints', listKey: visitpadKeys.chiefComplaints() },
  { listPath: '/diagnoses', listKey: visitpadKeys.diagnoses() },
  { listPath: '/allergens', listKey: visitpadKeys.allergens() },
  { listPath: '/allergy-reactions', listKey: visitpadKeys.reactions() },
  {
    listPath: '/rx-columns',
    listKey: visitpadKeys.rxColumns(),
    listKeyPrefix: [...visitpadKeys.all, 'rx-columns'],
  },
  { listPath: '/medicines', listKey: visitpadKeys.medicines() },
  { listPath: '/chronic-illnesses', listKey: visitpadKeys.chronicIllnesses() },
  { listPath: '/procedures', listKey: visitpadKeys.procedures() },
  { listPath: '/vaccines', listKey: visitpadKeys.vaccines() },
  { listPath: '/manufacturers', listKey: visitpadKeys.manufacturers() },
];

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
 * Avoids `visitpadKeys.all`, which refetches every section (e.g. units @ limit 200 on Vitals forms).
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
  const pathPart = importPath.split('?')[0];
  for (const entry of VISITPAD_LIST_INVALIDATION) {
    if (pathPart.endsWith(`${entry.listPath}/import-from-platform`)) {
      return visitpadInvalidationKeysForListPath(entry.listPath);
    }
  }
  return [[...visitpadKeys.all]];
}
