import type { MasterDataPermissionOption } from '@/features/configurator/components/create-tenant-wizard/wizard-master-data-permissions';
import { normalizeSlug } from '@/features/configurator/components/create-tenant-wizard/wizard-capability-helpers';
import { buildChildrenMap } from '@/features/configurator/components/create-tenant-wizard/wizard-helpers';
import {
  indexPermissionOptionsByModuleId,
  WIZARD_MODULE_TREE_MAX_LEVEL,
} from '@/features/configurator/components/create-tenant-wizard/wizard-module-tree';
import type { Module } from '@/features/master-data/types';
import type { Capability } from '../types';

export { WIZARD_MODULE_TREE_MAX_LEVEL as MASTER_DATA_PERMISSION_TREE_MAX_LEVEL };

function indexModulesBySlug(modules: Module[]): Map<string, Module[]> {
  const bySlug = new Map<string, Module[]>();
  for (const module of modules) {
    if (!module.is_active || module.is_deleted) continue;
    const slug = normalizeSlug(module.slug);
    const list = bySlug.get(slug) ?? [];
    list.push(module);
    bySlug.set(slug, list);
  }
  return bySlug;
}

/**
 * Resolves the Master Data `modules.slug` for a runtime capability row.
 * Role-capability API responses may omit provenance; fall back to the key's module segment.
 */
export function resolveCapabilityCatalogModuleSlug(
  capability: Capability,
  modules: Module[],
): string | null {
  const bySlug = indexModulesBySlug(modules);
  const candidates = [
    capability.source_module_slug?.trim(),
    capability.capability_key.trim().toLowerCase().split(':')[0]?.trim(),
    capability.module?.trim(),
  ].filter((value): value is string => Boolean(value?.length));

  for (const raw of candidates) {
    const slug = normalizeSlug(raw);
    const matches = bySlug.get(slug);
    if (!matches?.length) continue;
    const preferred =
      matches
        .filter((module) => module.level <= WIZARD_MODULE_TREE_MAX_LEVEL)
        .sort((a, b) => b.level - a.level)[0] ?? matches[0];
    if (!preferred) continue;
    return normalizeSlug(preferred.slug);
  }

  return null;
}

function findModuleForCapability(capability: Capability, modules: Module[]): Module | null {
  const slug = resolveCapabilityCatalogModuleSlug(capability, modules);
  if (!slug) return null;
  const matches = modules.filter(
    (module) =>
      module.is_active &&
      !module.is_deleted &&
      normalizeSlug(module.slug) === slug,
  );
  if (matches.length === 0) return null;
  return (
    matches
      .filter((module) => module.level <= WIZARD_MODULE_TREE_MAX_LEVEL)
      .sort((a, b) => b.level - a.level)[0] ??
    matches[0] ??
    null
  );
}

/** Maps role capabilities to the same option shape as the tenant wizard permission tree. */
export function capabilitiesToMasterDataPermissionOptions(
  capabilities: Capability[],
  modules: Module[],
): MasterDataPermissionOption[] {
  const nameBySlug = new Map(
    modules.map((module) => [normalizeSlug(module.slug), module.name]),
  );

  return capabilities.map((capability) => {
    const moduleSlug =
      resolveCapabilityCatalogModuleSlug(capability, modules) ??
      normalizeSlug(capability.source_module_slug?.trim() || capability.module);
    const permissionSlug = (
      capability.source_permission_slug?.trim() || capability.feature || capability.action
    ).toLowerCase();

    return {
      linkId: capability.id,
      moduleSlug,
      moduleName: nameBySlug.get(moduleSlug) ?? moduleSlug,
      permissionSlug,
      permissionName: capability.display_name,
      permissionAction: capability.action,
      isDefault: false,
      runtimeCapabilityId: capability.id,
      capabilityKey: capability.capability_key,
    };
  });
}

/** Adds `module` and each active (non-deleted) ancestor's id to `enabled`, walking up via `byId`. */
function addActiveModuleAndAncestors(
  module: Module,
  byId: Map<string, Module>,
  enabled: Set<string>,
): void {
  let current: Module | undefined = module;
  while (current) {
    if (current.is_active && !current.is_deleted) {
      enabled.add(current.id);
    }
    current = current.parent_id ? byId.get(current.parent_id) : undefined;
  }
}

/** Module ids on the catalog path for each role capability (includes L4+ leaves for rollup). */
export function enabledModuleIdsForRoleCapabilities(
  modules: Module[],
  capabilities: Capability[],
): Set<string> {
  const byId = new Map(modules.map((module) => [module.id, module]));
  const enabled = new Set<string>();

  for (const capability of capabilities) {
    const module = findModuleForCapability(capability, modules);
    if (module) {
      addActiveModuleAndAncestors(module, byId, enabled);
    }
  }

  return enabled;
}

/** Enables every catalog module on the path for a permission option (by `moduleSlug`). */
export function enabledModuleIdsForPermissionOptions(
  modules: Module[],
  permissionOptions: MasterDataPermissionOption[],
): Set<string> {
  const byId = new Map(modules.map((module) => [module.id, module]));
  const bySlug = indexModulesBySlug(modules);
  const enabled = new Set<string>();

  for (const option of permissionOptions) {
    const slug = normalizeSlug(option.moduleSlug);
    const matches = bySlug.get(slug) ?? [];
    for (const module of matches) {
      addActiveModuleAndAncestors(module, byId, enabled);
    }
  }

  return enabled;
}

export function buildMasterDataPermissionTreeContext(
  modules: Module[],
  capabilities: Capability[],
): {
  childMap: Map<string | null, Module[]>;
  rootModules: Module[];
  optionsByModuleId: Map<string, MasterDataPermissionOption[]>;
  enabledModuleIds: Set<string>;
  permissionOptions: MasterDataPermissionOption[];
} {
  const activeModules = modules.filter((module) => module.is_active && !module.is_deleted);
  const childMap = buildChildrenMap(activeModules);
  const rootModules = childMap.get(null) ?? [];
  const permissionOptions = capabilitiesToMasterDataPermissionOptions(capabilities, activeModules);
  const enabledFromCapabilities = enabledModuleIdsForRoleCapabilities(activeModules, capabilities);
  const enabledFromOptions = enabledModuleIdsForPermissionOptions(activeModules, permissionOptions);
  const enabledModuleIds = new Set<string>([
    ...enabledFromCapabilities,
    ...enabledFromOptions,
  ]);

  return {
    childMap,
    rootModules,
    optionsByModuleId: indexPermissionOptionsByModuleId(activeModules, permissionOptions),
    enabledModuleIds,
    permissionOptions,
  };
}
