import { useMemo } from 'react';
import { useTenantModules } from '@/features/configurator/api/tenants';
import { inferModuleSlugsFromCapabilityKeys } from '@/lib/infer-modules-from-capabilities';
import { usePermissionsStore } from '@/stores/permissions.store';
import { useTenantStore } from '@/stores/tenant.store';
import { useModuleCatalog } from './module-catalog';

/**
 * Active tenant module slugs from Configurator `tenant_modules` resolved via
 * Master Data catalog (`module_id` → `slug`). No static UUID map.
 */
export function useEnabledTenantModuleSlugs(): ReadonlySet<string> | null {
  const tenantId = useTenantStore((s) => s.tenantId);
  const capabilityKeys = usePermissionsStore((s) => s.capabilityKeys);
  const { index, isPending: catalogPending } = useModuleCatalog();

  const tenantModulesQuery = useTenantModules(tenantId ?? '', {
    enabled: Boolean(tenantId),
  });

  return useMemo((): ReadonlySet<string> | null => {
    if (!tenantId) {
      return null;
    }

    if (tenantModulesQuery.data?.data && index) {
      const slugs = new Set<string>();
      for (const row of tenantModulesQuery.data.data) {
        if (!row.is_active) {
          continue;
        }
        const entry = index.byId.get(row.module_id);
        if (entry) {
          slugs.add(entry.slug);
          // Legacy catalog names use underscores; manifests use kebab-case.
          if (entry.slug.includes('_')) {
            slugs.add(entry.slug.replaceAll('_', '-'));
          }
        }
      }
      if (slugs.size > 0) {
        return slugs;
      }
    }

    if (tenantModulesQuery.isPending || catalogPending) {
      return null;
    }

    const inferred = inferModuleSlugsFromCapabilityKeys(capabilityKeys);
    return inferred.size > 0 ? inferred : null;
  }, [
    tenantId,
    tenantModulesQuery.data,
    tenantModulesQuery.isPending,
    catalogPending,
    index,
    capabilityKeys,
  ]);
}
