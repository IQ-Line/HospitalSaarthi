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

/** Maps role capabilities to the same option shape as the tenant wizard permission tree. */
export function capabilitiesToMasterDataPermissionOptions(
  capabilities: Capability[],
  modules: Module[],
): MasterDataPermissionOption[] {
  const nameBySlug = new Map(
    modules.map((module) => [normalizeSlug(module.slug), module.name]),
  );

  return capabilities.map((capability) => {
    const moduleSlug = normalizeSlug(
      capability.source_module_slug?.trim() || capability.module,
    );
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

/** L1–L3 module ids that host at least one role capability (ancestors included). */
export function enabledModuleIdsForRoleCapabilities(
  modules: Module[],
  capabilities: Capability[],
): Set<string> {
  const bySlug = new Map(modules.map((module) => [normalizeSlug(module.slug), module]));
  const byId = new Map(modules.map((module) => [module.id, module]));
  const enabled = new Set<string>();

  const addModuleAndAncestors = (module: Module) => {
    let current: Module | undefined = module;
    while (current) {
      if (current.level > WIZARD_MODULE_TREE_MAX_LEVEL) {
        current = current.parent_id ? byId.get(current.parent_id) : undefined;
        continue;
      }
      if (!current.is_active || current.is_deleted) {
        current = current.parent_id ? byId.get(current.parent_id) : undefined;
        continue;
      }
      enabled.add(current.id);
      current = current.parent_id ? byId.get(current.parent_id) : undefined;
    }
  };

  for (const capability of capabilities) {
    const slug = normalizeSlug(capability.source_module_slug?.trim() || capability.module);
    const module = bySlug.get(slug);
    if (module) {
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
  const enabledModuleIds = enabledModuleIdsForRoleCapabilities(activeModules, capabilities);

  return {
    childMap,
    rootModules,
    optionsByModuleId: indexPermissionOptionsByModuleId(activeModules, permissionOptions),
    enabledModuleIds,
    permissionOptions,
  };
}
