import { normalizeModuleSlug } from "./module-slug.js";
import { isPlatformRuntimeModuleSlug } from "./platform-module-slugs.js";
import type { Capability } from "./types.js";

/** Separates module slug from permission slug in {@link masterDataSourcePairKey} (ASCII unit separator). */
export const MODULE_PERMISSION_PAIR_SEPARATOR = "\u001f";

/** Stable key for `(module_slug, permission_slug)` from Master Data `module_permissions`. */
export function masterDataSourcePairKey(moduleSlug: string, permissionSlug: string): string {
  return `${normalizeModuleSlug(moduleSlug)}${MODULE_PERMISSION_PAIR_SEPARATOR}${permissionSlug.trim().toLowerCase()}`;
}

export function parseMasterDataSourcePairKey(
  pairKey: string,
): { moduleSlug: string; permissionSlug: string } | null {
  const separator = pairKey.indexOf(MODULE_PERMISSION_PAIR_SEPARATOR);
  if (separator <= 0) {
    return null;
  }
  return {
    moduleSlug: pairKey.slice(0, separator),
    permissionSlug: pairKey.slice(separator + MODULE_PERMISSION_PAIR_SEPARATOR.length),
  };
}

/**
 * Whether a runtime capability may appear in the tenant assignable catalog for role composition.
 * Platform modules stay fully assignable; line-of-business modules require an active MD link.
 */
export function isRuntimeCapabilityAssignableForTenant(
  capability: Capability,
  assignableModuleSlugs: ReadonlySet<string>,
  activeMasterDataSourcePairs: ReadonlySet<string>,
): boolean {
  const moduleSlug = normalizeModuleSlug(
    capability.source_module_slug?.trim() || capability.module,
  );

  if (isPlatformRuntimeModuleSlug(moduleSlug)) {
    return true;
  }

  const sourceModule = capability.source_module_slug?.trim();
  const sourcePermission = capability.source_permission_slug?.trim();
  if (!sourceModule || !sourcePermission) {
    return false;
  }

  const normalizedSourceModule = normalizeModuleSlug(sourceModule);
  if (!assignableModuleSlugs.has(normalizedSourceModule)) {
    return false;
  }

  return activeMasterDataSourcePairs.has(
    masterDataSourcePairKey(sourceModule, sourcePermission),
  );
}

export function filterRuntimeCapabilitiesByMasterDataLinks(
  capabilities: Capability[],
  assignableModuleSlugs: ReadonlySet<string>,
  activeMasterDataSourcePairs: ReadonlySet<string>,
): Capability[] {
  return capabilities.filter((capability) =>
    isRuntimeCapabilityAssignableForTenant(
      capability,
      assignableModuleSlugs,
      activeMasterDataSourcePairs,
    ),
  );
}
