import type { Module } from '@/features/master-data/types';
import type { MasterDataPermissionOption } from './wizard-master-data-permissions';
import { normalizeSlug } from './wizard-capability-helpers';

/** L1 → L2 → L3 module nodes; deeper catalog rows roll permissions into the L3 parent. */
export const WIZARD_MODULE_TREE_MAX_LEVEL = 3;

export function indexPermissionOptionsByModuleId(
  modules: Module[],
  options: MasterDataPermissionOption[],
): Map<string, MasterDataPermissionOption[]> {
  const slugToId = new Map(modules.map((module) => [normalizeSlug(module.slug), module.id]));
  const byModuleId = new Map<string, MasterDataPermissionOption[]>();

  for (const option of options) {
    if (option.runtimeCapabilityId === null) continue;
    const moduleId = slugToId.get(normalizeSlug(option.moduleSlug));
    if (!moduleId) continue;
    const list = byModuleId.get(moduleId) ?? [];
    list.push(option);
    byModuleId.set(moduleId, list);
  }

  for (const list of byModuleId.values()) {
    list.sort((a, b) => a.permissionName.localeCompare(b.permissionName));
  }

  return byModuleId;
}

export function moduleSubtreeHasEnabledSelection(
  moduleId: string,
  childMap: Map<string | null, Module[]>,
  enabledModuleIds: Set<string>,
): boolean {
  if (enabledModuleIds.has(moduleId)) return true;
  for (const child of childMap.get(moduleId) ?? []) {
    if (!child.is_active || child.is_deleted) continue;
    if (moduleSubtreeHasEnabledSelection(child.id, childMap, enabledModuleIds)) return true;
  }
  return false;
}

/** L1 roots that intersect the step-2 module selection. */
export function filterRootModulesForEnabledSelection(
  rootModules: Module[],
  childMap: Map<string | null, Module[]>,
  enabledModuleIds: Set<string>,
): Module[] {
  return rootModules.filter((module) =>
    moduleSubtreeHasEnabledSelection(module.id, childMap, enabledModuleIds),
  );
}

export function filterChildModulesForWizardTree(
  parent: Module,
  childMap: Map<string | null, Module[]>,
  enabledModuleIds: Set<string>,
): Module[] {
  if (parent.level >= WIZARD_MODULE_TREE_MAX_LEVEL) return [];

  return (childMap.get(parent.id) ?? []).filter((child) => {
    if (!child.is_active || child.is_deleted) return false;
    if (child.level > WIZARD_MODULE_TREE_MAX_LEVEL) return false;
    return moduleSubtreeHasEnabledSelection(child.id, childMap, enabledModuleIds);
  });
}

function collectDescendantPermissionOptions(
  moduleId: string,
  childMap: Map<string | null, Module[]>,
  enabledModuleIds: Set<string>,
  optionsByModuleId: Map<string, MasterDataPermissionOption[]>,
): MasterDataPermissionOption[] {
  const collected: MasterDataPermissionOption[] = [];

  const walk = (id: string) => {
    for (const child of childMap.get(id) ?? []) {
      if (!child.is_active || child.is_deleted) continue;
      if (!enabledModuleIds.has(child.id)) continue;
      collected.push(...(optionsByModuleId.get(child.id) ?? []));
      if (child.level >= WIZARD_MODULE_TREE_MAX_LEVEL) continue;
      walk(child.id);
    }
  };

  walk(moduleId);
  return collected;
}

function dedupePermissionOptions(
  options: MasterDataPermissionOption[],
): MasterDataPermissionOption[] {
  const seen = new Set<string>();
  return options.filter((option) => {
    if (option.runtimeCapabilityId === null || seen.has(option.runtimeCapabilityId)) {
      return false;
    }
    seen.add(option.runtimeCapabilityId);
    return true;
  });
}

/** All permissions in this module node and every enabled descendant (for per-level select-all). */
export function permissionOptionsForModuleSubtree(
  module: Module,
  childMap: Map<string | null, Module[]>,
  enabledModuleIds: Set<string>,
  optionsByModuleId: Map<string, MasterDataPermissionOption[]>,
): MasterDataPermissionOption[] {
  const direct = optionsByModuleId.get(module.id) ?? [];
  const descendant = collectDescendantPermissionOptions(
    module.id,
    childMap,
    enabledModuleIds,
    optionsByModuleId,
  );
  return dedupePermissionOptions([...direct, ...descendant]);
}

/** Direct + rolled-up permissions for a module node (L3 includes L4+ links). */
export function permissionOptionsForModuleNode(
  module: Module,
  childMap: Map<string | null, Module[]>,
  enabledModuleIds: Set<string>,
  optionsByModuleId: Map<string, MasterDataPermissionOption[]>,
): MasterDataPermissionOption[] {
  const direct = optionsByModuleId.get(module.id) ?? [];
  if (module.level < WIZARD_MODULE_TREE_MAX_LEVEL) {
    return direct;
  }
  return dedupePermissionOptions([
    ...direct,
    ...collectDescendantPermissionOptions(module.id, childMap, enabledModuleIds, optionsByModuleId),
  ]);
}

export function allCapabilityIdsFromOptions(
  options: MasterDataPermissionOption[],
): string[] {
  return options
    .map((option) => option.runtimeCapabilityId)
    .filter((id): id is string => id !== null);
}
