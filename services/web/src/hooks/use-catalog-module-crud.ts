import { useMemo } from 'react';
import {
  catalogModuleCrudAccess,
  type CatalogModuleCrudAccess,
  type CatalogModuleCrudAccessOptions,
} from '@/lib/catalog-module-crud-access';
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
  return useMemo(
    () => catalogModuleCrudAccess(capabilityKeys, catalogModuleSlug, options),
    [capabilityKeys, catalogModuleSlug, options?.productModuleSlug],
  );
}
