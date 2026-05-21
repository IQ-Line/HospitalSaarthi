import { useMemo } from 'react';
import { useQuery, type QueryClient } from '@tanstack/react-query';
import { queryClient } from '@/lib/query-client';
import { platformCatalogClient } from '@/features/master-data/api/platform-catalog-client';
import { masterDataKeys } from '@/features/master-data/api/query-keys';
import type { Module, ModuleListResponse } from '@/features/master-data/types';
import { configuratorKeys } from '@/features/configurator/api/query-keys';
import { invalidateComposedNavigationCache } from './module-manifest-loader';
import type { ModuleCatalogEntry, ModuleCatalogIndex } from './types';

const MODULE_CATALOG_STALE_MS = 5 * 60 * 1000;

export function buildCatalogIndex(modules: readonly Module[]): ModuleCatalogIndex | null {
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
      level: module.level,
      parent_id: module.parent_id,
    };
    byId.set(module.id, entry);
    byId.set(module.id.toLowerCase(), entry);
    bySlug.set(module.slug, entry);
  }

  return { byId, bySlug };
}

/**
 * Platform module registry (`global_master.modules`) for resolving Configurator `tenant_modules`.
 * Must not send `iq_tenant_id` — tenant-scoped catalog rows use different ids than enablement rows.
 */
export function useModuleCatalog() {
  const query = useQuery({
    queryKey: masterDataKeys.globalModules(),
    queryFn: () =>
      platformCatalogClient<ModuleListResponse>('/api/v1/master-data/modules', {
        method: 'GET',
      }),
    staleTime: MODULE_CATALOG_STALE_MS,
    gcTime: MODULE_CATALOG_STALE_MS * 2,
    retry: 1,
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

/** Sync read of the platform module catalog from the React Query cache (for route guards). */
export function getModuleCatalogIndexFromCache(
  client: QueryClient = queryClient,
): ModuleCatalogIndex | null {
  const data = client.getQueryData<ModuleListResponse>(masterDataKeys.globalModules());
  return data?.data ? buildCatalogIndex(data.data) : null;
}

export function moduleCatalogQueryOptions() {
  return {
    queryKey: masterDataKeys.globalModules(),
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
