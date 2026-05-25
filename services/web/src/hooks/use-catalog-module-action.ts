import { useMemo } from 'react';
import { principalHasCatalogModuleAction } from '@/lib/catalog-route-access';
import { usePermissionsStore } from '@/stores/permissions.store';

export { useCatalogModuleCrud } from '@/hooks/use-catalog-module-crud';

/** UX gate: principal holds any runtime key for the catalog module slug and action. */
export function useCatalogModuleAction(moduleSlug: string, action: string): boolean {
  const capabilityKeys = usePermissionsStore((s) => s.capabilityKeys);
  return useMemo(
    () => principalHasCatalogModuleAction(capabilityKeys, moduleSlug, action),
    [capabilityKeys, moduleSlug, action],
  );
}
