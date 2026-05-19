import { useMemo } from 'react';

import { useTenantModules } from '@/features/configurator/api/tenants';

import { useTenantStore } from '@/stores/tenant.store';

import { addCatalogSlugToSet, catalogSlugVariants } from './catalog-slug-variants';

import { getRegisteredModuleManifests } from './module-registry';

import { useModuleCatalog } from './module-catalog';

import type { ModuleManifest } from './types';



function catalogEnablesManifest(manifest: ModuleManifest, catalogSlugs: ReadonlySet<string>): boolean {

  if (manifest.tenantScoped === false) {

    return true;

  }

  if (manifest.requiredModulesAny?.length) {

    return manifest.requiredModulesAny.some((slug) =>

      catalogSlugVariants(slug).some((variant) => catalogSlugs.has(variant)),

    );

  }

  return catalogSlugVariants(manifest.slug).some((variant) => catalogSlugs.has(variant));

}



/**

 * Active tenant module slugs from Configurator `tenant_modules` resolved via

 * Master Data catalog (`module_id` → `slug`). No static UUID map or capability inference.

 */

export function useEnabledTenantModuleSlugs(): ReadonlySet<string> | null {

  const tenantId = useTenantStore((s) => s.tenantId);

  const { index, isPending: catalogPending, isError: catalogError } = useModuleCatalog();



  const tenantModulesQuery = useTenantModules(tenantId ?? '', {

    enabled: Boolean(tenantId),

  });



  return useMemo((): ReadonlySet<string> | null => {

    if (!tenantId) {

      return null;

    }



    if (tenantModulesQuery.isPending || catalogPending) {

      return null;

    }



    if (tenantModulesQuery.isError || catalogError || !index) {

      return new Set();

    }



    const catalogSlugs = new Set<string>();

    for (const row of tenantModulesQuery.data?.data ?? []) {

      if (!row.is_active) {

        continue;

      }

      const moduleId = row.module_id.trim();
      const entry =
        index.byId.get(moduleId) ??
        index.byId.get(moduleId.toLowerCase()) ??
        index.byId.get(moduleId.toUpperCase());

      if (entry) {

        addCatalogSlugToSet(catalogSlugs, entry.slug);

      }

    }



    const enabled = new Set<string>();

    for (const manifest of getRegisteredModuleManifests()) {

      if (manifest.tenantScoped === false) {

        continue;

      }

      if (!catalogEnablesManifest(manifest, catalogSlugs)) {

        continue;

      }

      addCatalogSlugToSet(enabled, manifest.slug);

      for (const slug of manifest.requiredModulesAny ?? []) {

        addCatalogSlugToSet(enabled, slug);

      }

    }



    return enabled;

  }, [

    tenantId,

    tenantModulesQuery.data,

    tenantModulesQuery.isPending,

    tenantModulesQuery.isError,

    catalogPending,

    catalogError,

    index,

  ]);

}


