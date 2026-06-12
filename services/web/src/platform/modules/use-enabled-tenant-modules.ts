import { useMemo } from 'react';

import { useTenantModules } from '@/features/configurator/api/tenants';
import { capabilityKeysGrantProductAccess } from '@/navigation/module-product-access';
import { resolvePlatformSuperAdmin, resolveTenantAdmin } from '@/lib/platform-admin';
import { useAuthStore } from '@/stores/auth.store';
import { usePermissionsStore } from '@/stores/permissions.store';
import { useTenantStore } from '@/stores/tenant.store';

import { addCatalogSlugToSet, catalogSlugVariants } from './catalog-slug-variants';

import { getRegisteredModuleManifests } from './module-registry';

import { useModuleCatalog } from './module-catalog';

import type { ModuleCatalogEntry, ModuleCatalogIndex, ModuleManifest } from './types';

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

/** Matches `modules/user-management/.../catalog-module-tree.ts` (seed uses `level = 1`). */
export function isCatalogL1Module(entry: ModuleCatalogEntry): boolean {
  return entry.level === 1 && entry.parent_id == null;
}

/** Active L1 slugs from Master Data `global_master.modules` (platform catalog roots only). */
export function catalogSlugSetFromIndex(
  index: ModuleCatalogIndex,
  options?: { excludeProductModules?: boolean },
): ReadonlySet<string> {
  const catalogSlugs = new Set<string>();
  for (const entry of index.bySlug.values()) {
    if (!isCatalogL1Module(entry)) {
      continue;
    }
    if (options?.excludeProductModules && entry.module_kind === 'product') {
      continue;
    }
    addCatalogSlugToSet(catalogSlugs, entry.slug);
  }
  return catalogSlugs;
}

/** Resolves active Configurator `tenant_modules` rows to catalog slugs via `module_id`. */
export function catalogSlugsFromTenantModules(
  index: ModuleCatalogIndex,
  tenantModules: readonly { module_id: string; is_active: boolean }[],
): ReadonlySet<string> {
  const catalogSlugs = new Set<string>();
  for (const row of tenantModules) {
    if (!row.is_active) {
      continue;
    }

    const moduleId = row.module_id?.trim();
    if (!moduleId) {
      continue;
    }
    const entry =
      index.byId.get(moduleId) ??
      index.byId.get(moduleId.toLowerCase()) ??
      index.byId.get(moduleId.toUpperCase());

    if (entry) {
      addCatalogSlugToSet(catalogSlugs, entry.slug);
    }
  }
  return catalogSlugs;
}

/** Fallback when global_master.modules is unavailable — all tenant-gated SPA manifests. */
export function allRegisteredManifestTenantGateSlugs(): ReadonlySet<string> {
  const enabled = new Set<string>();
  for (const manifest of getRegisteredModuleManifests()) {
    if (manifest.tenantScoped === false) {
      continue;
    }
    addCatalogSlugToSet(enabled, manifest.slug);
    for (const slug of manifest.requiredModulesAny ?? []) {
      addCatalogSlugToSet(enabled, slug);
    }
    for (const slug of manifest.requiredModules ?? []) {
      addCatalogSlugToSet(enabled, slug);
    }
  }
  return enabled;
}

/** Manifest slugs enabled when the given catalog slug set includes their tenant gates. */
export function buildEnabledModuleSlugsFromCatalog(
  catalogSlugs: ReadonlySet<string>,
): ReadonlySet<string> {
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
}



/**
 * Module slugs for navigation tenant gates.
 * - Platform super-admin: all active Master Data catalog L1 modules (not Configurator tenant_modules).
 * - Everyone else: Configurator `tenant_modules` resolved via catalog `module_id` → `slug`.
 */
/** Nav inputs: one module-catalog query + tenant modules (avoids duplicate global modules fetches). */
export function useTenantModuleNavContext(): {
  enabledModuleSlugs: ReadonlySet<string> | null;
  catalogIndex: ModuleCatalogIndex | null;
} {
  const tenantId = useTenantStore((s) => s.tenantId);
  const capabilityKeys = usePermissionsStore((s) => s.capabilityKeys);
  const principalRoles = usePermissionsStore((s) => s.roles);
  const authRoles = useAuthStore((s) => s.roles);
  const accessToken = useAuthStore((s) => s.accessToken);
  const isSuperAdmin = resolvePlatformSuperAdmin({
    principalRoles,
    authRoles,
    accessToken,
  });
  const isTenantAdminRole = resolveTenantAdmin({
    principalRoles,
    authRoles,
    accessToken,
  });

  const { index, isPending: catalogPending, isError: catalogError } = useModuleCatalog();

  const tenantModulesQuery = useTenantModules(tenantId ?? '', {
    enabled: Boolean(tenantId) && !isSuperAdmin,
  });

  const enabledModuleSlugs = useMemo((): ReadonlySet<string> | null => {
    if (!tenantId) {
      return null;
    }

    if (catalogPending) {
      return null;
    }

    if (catalogError || !index) {
      return isSuperAdmin ? allRegisteredManifestTenantGateSlugs() : new Set();
    }

    if (isSuperAdmin) {
      const catalogSlugs = catalogSlugSetFromIndex(index, { excludeProductModules: true });
      if (catalogSlugs.size === 0) {
        return allRegisteredManifestTenantGateSlugs();
      }
      return buildEnabledModuleSlugsFromCatalog(catalogSlugs);
    }

    if (tenantModulesQuery.isPending) {
      return null;
    }

    if (tenantModulesQuery.isError) {
      return new Set();
    }

    const tenantCatalogSlugs = catalogSlugsFromTenantModules(
      index,
      tenantModulesQuery.data?.data ?? [],
    );

    if (isTenantAdminRole) {
      const enriched = new Set(tenantCatalogSlugs);
      addCatalogSlugToSet(enriched, 'configurator');
      if (capabilityKeysGrantProductAccess(capabilityKeys, ['master-data'], index)) {
        addCatalogSlugToSet(enriched, 'master-data');
      }
      if (capabilityKeysGrantProductAccess(capabilityKeys, ['visitpad-master'], index)) {
        addCatalogSlugToSet(enriched, 'visitpad-master');
        addCatalogSlugToSet(enriched, 'master-data');
      }
      return buildEnabledModuleSlugsFromCatalog(enriched);
    }

    return buildEnabledModuleSlugsFromCatalog(tenantCatalogSlugs);
  }, [
    tenantId,
    capabilityKeys,
    isSuperAdmin,
    isTenantAdminRole,
    tenantModulesQuery.data,
    tenantModulesQuery.isPending,
    tenantModulesQuery.isError,
    catalogPending,
    catalogError,
    index,
  ]);

  return { enabledModuleSlugs, catalogIndex: index };
}

export function useEnabledTenantModuleSlugs(): ReadonlySet<string> | null {
  return useTenantModuleNavContext().enabledModuleSlugs;
}


