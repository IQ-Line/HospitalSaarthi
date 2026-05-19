import { useMemo } from 'react';
import { useQuery, type QueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { masterDataKeys } from '@/features/master-data/api/query-keys';
import type { Module, ModuleListResponse } from '@/features/master-data/types';
import { configuratorKeys } from '@/features/configurator/api/query-keys';
import { invalidateComposedNavigationCache } from './module-manifest-loader';
import type { ModuleCatalogEntry, ModuleCatalogIndex } from './types';

const MODULE_CATALOG_STALE_MS = 5 * 60 * 1000;

function buildCatalogIndex(modules: readonly Module[]): ModuleCatalogIndex | null {
  const byId = new Map<string, ModuleCatalogEntry>();
  const bySlug = new Map<string, ModuleCatalogEntry>();

  for (const module of modules) {
    if (!module.is_active || module.is_deleted) {
      continue;
    }
    const entry: ModuleCatalogEntry = {
      id: module.id,
      slug: module.slug,
      name: module.name,
      icon: module.icon,
      category: module.category,
      is_active: module.is_active,
    };
    byId.set(module.id, entry);
    bySlug.set(module.slug, entry);
  }

  return { byId, bySlug };
}

/**
 * Master Data module catalog — authoritative id ↔ slug map for tenant_modules.
 */
export function useModuleCatalog() {
  const query = useQuery({
    queryKey: masterDataKeys.modules(),
    queryFn: () => apiClient<ModuleListResponse>('/api/v1/master-data/modules'),
    staleTime: MODULE_CATALOG_STALE_MS,
    gcTime: MODULE_CATALOG_STALE_MS * 2,
  });

  const index = useMemo(
    () => (query.data?.data ? buildCatalogIndex(query.data.data) : null),
    [query.data],
  );

  return {
    ...query,
    index,
    isReady: Boolean(index),
  };
}

export function moduleCatalogQueryOptions() {
  return {
    queryKey: masterDataKeys.modules(),
    staleTime: MODULE_CATALOG_STALE_MS,
  } as const;
}

/**
 * Invalidate catalog + tenant module enablement (after provisioning or MD catalog edits).
 */
export function invalidateModuleRegistration(queryClient: QueryClient, tenantId?: string): void {
  queryClient.invalidateQueries({ queryKey: masterDataKeys.modulesRoot() });
  if (tenantId) {
    queryClient.invalidateQueries({ queryKey: configuratorKeys.tenantModules(tenantId) });
  } else {
    queryClient.invalidateQueries({ queryKey: configuratorKeys.all });
  }
  invalidateComposedNavigationCache();
}
