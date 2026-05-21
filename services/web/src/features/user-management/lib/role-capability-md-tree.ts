import type { MasterDataPermissionOption } from '@/features/configurator/components/create-tenant-wizard/wizard-master-data-permissions';
import { normalizeSlug } from '@/features/configurator/components/create-tenant-wizard/wizard-capability-helpers';
import { buildChildrenMap } from '@/features/configurator/components/create-tenant-wizard/wizard-helpers';
import {
  indexPermissionOptionsByModuleId,
  WIZARD_MODULE_TREE_MAX_LEVEL,
} from '@/features/configurator/components/create-tenant-wizard/wizard-module-tree';
import type { Module } from '@/features/master-data/types';
import { canonicalizeRuntimeCapabilityKey } from '@/lib/legacy-capability-key-remap';
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
 * Role-capability API responses may omit provenance; legacy keys use `um:*` / `user-management:*`.
 */
export function resolveCapabilityCatalogModuleSlug(
  capability: Capability,
  modules: Module[],
): string | null {
  const bySlug = indexModulesBySlug(modules);
  const candidates = [
    capability.source_module_slug?.trim(),
    canonicalizeRuntimeCapabilityKey(capability.capability_key).split(':')[0]?.trim(),
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
      .sort((a, b) => b.level - a.level)[0] ?? matches[0]
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

/** Module ids on the catalog path for each role capability (includes L4+ leaves for rollup). */
export function enabledModuleIdsForRoleCapabilities(
  modules: Module[],
  capabilities: Capability[],
): Set<string> {
  const byId = new Map(modules.map((module) => [module.id, module]));
  const enabled = new Set<string>();

  const addModuleAndAncestors = (module: Module) => {
    let current: Module | undefined = module;
    while (current) {
      if (!current.is_active || current.is_deleted) {
        current = current.parent_id ? byId.get(current.parent_id) : undefined;
        continue;
      }
      enabled.add(current.id);
      current = current.parent_id ? byId.get(current.parent_id) : undefined;
    }
  };

  for (const capability of capabilities) {
    const module = findModuleForCapability(capability, modules);
    if (module) {
      addModuleAndAncestors(module);
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

  const addModuleAndAncestors = (module: Module) => {
    let current: Module | undefined = module;
    while (current) {
      if (!current.is_active || current.is_deleted) {
        current = current.parent_id ? byId.get(current.parent_id) : undefined;
        continue;
      }
      enabled.add(current.id);
      current = current.parent_id ? byId.get(current.parent_id) : undefined;
    }
  };

  for (const option of permissionOptions) {
    const slug = normalizeSlug(option.moduleSlug);
    const matches = bySlug.get(slug) ?? [];
    for (const module of matches) {
      addModuleAndAncestors(module);
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
