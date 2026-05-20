import { useMemo } from 'react';
import { principalHasCatalogModuleAction } from '@/lib/catalog-route-access';
import { usePermissionsStore } from '@/stores/permissions.store';

/** UX gate: principal holds any runtime key for the catalog module slug and action. */
export function useCatalogModuleAction(moduleSlug: string, action: string): boolean {
  const capabilityKeys = usePermissionsStore((s) => s.capabilityKeys);
  return useMemo(
    () => principalHasCatalogModuleAction(capabilityKeys, moduleSlug, action),
    [capabilityKeys, moduleSlug, action],
  );
}
