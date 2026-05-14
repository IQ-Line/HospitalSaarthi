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

/**
 * Query key roots to invalidate after `POST …/visitpad/…/import-from-platform` succeeds.
 * Prefer this over `visitpadKeys.all` to avoid refetching unrelated Visitpad lists.
 */
export function visitpadInvalidationKeysAfterPlatformImport(
  importPath: string,
): readonly (readonly unknown[])[] {
  const pathPart = importPath.split('?')[0];
  const section = new URLSearchParams(importPath.split('?')[1] ?? '').get('section') ?? undefined;

  const pairs: [readonly unknown[], readonly unknown[]][] = [
    ['/units/import-from-platform', [visitpadKeys.units(), tenantCatalogKeysPrefix('/units')]],
    ['/unit-conversions/import-from-platform', [visitpadKeys.conversions(), tenantCatalogKeysPrefix('/unit-conversions')]],
    ['/vitals/import-from-platform', [visitpadKeys.vitals(), tenantCatalogKeysPrefix('/vitals')]],
    ['/chief-complaints/import-from-platform', [visitpadKeys.chiefComplaints(), tenantCatalogKeysPrefix('/chief-complaints')]],
    ['/diagnoses/import-from-platform', [visitpadKeys.diagnoses(), tenantCatalogKeysPrefix('/diagnoses')]],
    ['/allergens/import-from-platform', [visitpadKeys.allergens(), tenantCatalogKeysPrefix('/allergens')]],
    ['/allergy-reactions/import-from-platform', [visitpadKeys.reactions(), tenantCatalogKeysPrefix('/allergy-reactions')]],
    ['/rx-columns/import-from-platform', [visitpadKeys.rxColumns(section), tenantCatalogKeysPrefix('/rx-columns')]],
    ['/medicines/import-from-platform', [visitpadKeys.medicines(), tenantCatalogKeysPrefix('/medicines')]],
    ['/chronic-illnesses/import-from-platform', [visitpadKeys.chronicIllnesses(), tenantCatalogKeysPrefix('/chronic-illnesses')]],
    ['/procedures/import-from-platform', [visitpadKeys.procedures(), tenantCatalogKeysPrefix('/procedures')]],
    ['/vaccines/import-from-platform', [visitpadKeys.vaccines(), tenantCatalogKeysPrefix('/vaccines')]],
    ['/manufacturers/import-from-platform', [visitpadKeys.manufacturers(), tenantCatalogKeysPrefix('/manufacturers')]],
  ];

  for (const [suffix, keys] of pairs) {
    if (pathPart.endsWith(suffix)) {
      return [keys[0], keys[1]];
    }
  }
  return [[...visitpadKeys.all]];
}
