import { useMemo } from 'react';

import { useTenantModules } from '@/features/configurator/api/tenants';
import { resolvePlatformSuperAdmin } from '@/lib/platform-admin';
import { useAuthStore } from '@/stores/auth.store';
import { usePermissionsStore } from '@/stores/permissions.store';
import { useTenantStore } from '@/stores/tenant.store';

import { addCatalogSlugToSet, catalogSlugVariants } from './catalog-slug-variants';

import { getRegisteredModuleManifests } from './module-registry';

import { useModuleCatalog } from './module-catalog';

import { registerBuiltinModuleManifests } from './register-builtin-modules';

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
export function catalogSlugSetFromIndex(index: ModuleCatalogIndex): ReadonlySet<string> {
  const catalogSlugs = new Set<string>();
  for (const entry of index.bySlug.values()) {
    if (!isCatalogL1Module(entry)) {
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

    const moduleId = row.module_id.trim();
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
  registerBuiltinModuleManifests();
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
export function useEnabledTenantModuleSlugs(): ReadonlySet<string> | null {
  const tenantId = useTenantStore((s) => s.tenantId);
  const principalRoles = usePermissionsStore((s) => s.roles);
  const authRoles = useAuthStore((s) => s.roles);
  const accessToken = useAuthStore((s) => s.accessToken);
  const isSuperAdmin = resolvePlatformSuperAdmin({
    principalRoles,
    authRoles,
    accessToken,
  });

  const { index, isPending: catalogPending, isError: catalogError } = useModuleCatalog();

  const tenantModulesQuery = useTenantModules(tenantId ?? '', {
    enabled: Boolean(tenantId) && !isSuperAdmin,
  });

  return useMemo((): ReadonlySet<string> | null => {
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
      const catalogSlugs = catalogSlugSetFromIndex(index);
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

    return buildEnabledModuleSlugsFromCatalog(
      catalogSlugsFromTenantModules(index, tenantModulesQuery.data?.data ?? []),
    );
  }, [
    tenantId,
    isSuperAdmin,
    tenantModulesQuery.data,
    tenantModulesQuery.isPending,
    tenantModulesQuery.isError,
    catalogPending,
    catalogError,
    index,
  ]);
}


