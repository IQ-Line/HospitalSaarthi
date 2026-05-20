import type { CapabilityTreeNode } from '@/features/user-management/components/role-management-sections';
import type { Capability } from '@/features/user-management/types';
import type { Module, ModulePermission, Permission } from '@/features/master-data/types';
import { expandModuleIdsWithDescendants, moduleSlugsForIds } from './wizard-capability-helpers';

function normalizeSlug(slug: string): string {
  return slug.trim().toLowerCase().replace(/_/g, '-');
}

function sourcePairKey(moduleSlug: string, permissionSlug: string): string {
  return `${normalizeSlug(moduleSlug)}:${permissionSlug.trim().toLowerCase()}`;
}

export type MasterDataPermissionOption = {
  linkId: string;
  moduleSlug: string;
  moduleName: string;
  permissionSlug: string;
  permissionName: string;
  permissionAction: string;
  isDefault: boolean;
  /** UM `capabilities.id` when synced from this MD link; null if not in runtime catalog yet. */
  runtimeCapabilityId: string | null;
  capabilityKey: string | null;
};

/**
 * Permissions for the tenant wizard: `global_master.module_permissions` for enabled modules,
 * joined to `modules` and `permissions`. Runtime IDs come from UM catalog lookup by source pair only.
 */
export function buildMasterDataPermissionOptions(
  modules: Module[],
  permissions: Permission[],
  modulePermissions: ModulePermission[],
  enabledModuleIds: Set<string>,
  runtimeCapabilities: Capability[],
): MasterDataPermissionOption[] {
  const moduleById = new Map(modules.map((m) => [m.id, m]));
  const expandedModuleIds = expandModuleIdsWithDescendants(enabledModuleIds, modules);
  const enabledModuleSlugSet = new Set(moduleSlugsForIds(expandedModuleIds, modules));
  const permissionById = new Map(permissions.map((p) => [p.id, p]));
  const capabilityBySource = new Map<string, Capability>();

  for (const capability of runtimeCapabilities) {
    if (!capability.source_module_slug || !capability.source_permission_slug) continue;
    if (!capability.is_active) continue;
    if (!enabledModuleSlugSet.has(normalizeSlug(capability.source_module_slug))) continue;
    capabilityBySource.set(
      sourcePairKey(capability.source_module_slug, capability.source_permission_slug),
      capability,
    );
  }

  const options: MasterDataPermissionOption[] = [];

  for (const link of modulePermissions) {
    if (!link.is_active || link.is_deleted) continue;
    if (!expandedModuleIds.has(link.module_id)) continue;

    const module = moduleById.get(link.module_id);
    const permission = permissionById.get(link.permission_id);
    if (!module || !permission) continue;

    const moduleSlug = normalizeSlug(module.slug);
    const permissionSlug = permission.slug.trim().toLowerCase();
    const runtime = capabilityBySource.get(sourcePairKey(moduleSlug, permissionSlug));

    options.push({
      linkId: link.id,
      moduleSlug,
      moduleName: module.name,
      permissionSlug,
      permissionName: permission.name,
      permissionAction: permission.action,
      isDefault: link.is_default,
      runtimeCapabilityId: runtime?.id ?? null,
      capabilityKey: runtime?.capability_key ?? null,
    });
  }

  return options.sort((a, b) => {
    const moduleCmp = a.moduleName.localeCompare(b.moduleName);
    if (moduleCmp !== 0) return moduleCmp;
    return a.permissionName.localeCompare(b.permissionName);
  });
}

/** Tree rows use UM `Capability` shape; only options with a synced runtime capability are selectable. */
export function masterDataOptionsToCapabilityViews(
  options: MasterDataPermissionOption[],
): Capability[] {
  return options
    .filter((option) => option.runtimeCapabilityId !== null)
    .map((option) => ({
      id: option.runtimeCapabilityId!,
      capability_key: option.capabilityKey ?? `${option.moduleSlug}:${option.permissionSlug}`,
      module: option.moduleSlug,
      feature: option.permissionSlug,
      action: option.permissionAction,
      display_name: option.permissionName,
      description: `${option.moduleName} · ${option.permissionSlug}`,
      is_active: true,
      source_catalog: 'master_data' as const,
      source_module_slug: option.moduleSlug,
      source_permission_slug: option.permissionSlug,
    }));
}

export function defaultCapabilityIdsFromMasterDataOptions(
  options: MasterDataPermissionOption[],
): string[] {
  return options
    .filter((option) => option.isDefault && option.runtimeCapabilityId !== null)
    .map((option) => option.runtimeCapabilityId!);
}

export function countUnmappedMasterDataPermissions(options: MasterDataPermissionOption[]): number {
  return options.filter((option) => option.runtimeCapabilityId === null).length;
}

/** Step 3 catalog: MD links for checked modules only, then runtime rows scoped to those slugs. */
export function buildWizardRolePermissionCatalog(
  modules: Module[],
  permissions: Permission[],
  modulePermissions: ModulePermission[],
  enabledModuleIds: Set<string>,
  runtimeCapabilities: Capability[],
): {
  options: MasterDataPermissionOption[];
  selectableCapabilities: Capability[];
  enabledModuleSlugs: string[];
} {
  const enabledModuleSlugs = moduleSlugsForIds(enabledModuleIds, modules);
  const options = buildMasterDataPermissionOptions(
    modules,
    permissions,
    modulePermissions,
    enabledModuleIds,
    runtimeCapabilities,
  );
  const selectableCapabilities = masterDataOptionsToCapabilityViews(options);
  return { options, selectableCapabilities, enabledModuleSlugs };
}

/**
 * Initial grants for the wizard admin role: every synced permission for modules enabled in
 * step 2 (not limited to Master Data `is_default`).
 */
export function defaultSelectableCapabilityIds(
  _options: MasterDataPermissionOption[],
  selectableCapabilities: Capability[],
): string[] {
  return selectableCapabilities.map((capability) => capability.id);
}

/**
 * Permission tree for the create-tenant wizard: one branch per enabled module from step 2,
 * using Master Data module names (not raw `capability.module` runtime keys).
 */
export function buildWizardCapabilityTree(
  options: MasterDataPermissionOption[],
): CapabilityTreeNode[] {
  const byModuleSlug = new Map<string, MasterDataPermissionOption[]>();

  for (const option of options) {
    if (option.runtimeCapabilityId === null) continue;
    const list = byModuleSlug.get(option.moduleSlug) ?? [];
    list.push(option);
    byModuleSlug.set(option.moduleSlug, list);
  }

  return [...byModuleSlug.entries()]
    .sort(([, left], [, right]) =>
      (left[0]?.moduleName ?? '').localeCompare(right[0]?.moduleName ?? ''),
    )
    .map(([moduleSlug, moduleOptions]) => {
      const sorted = [...moduleOptions].sort((a, b) =>
        a.permissionName.localeCompare(b.permissionName),
      );
      const children: CapabilityTreeNode[] = sorted.map((option) => {
        const capability = masterDataOptionsToCapabilityViews([option])[0]!;
        return {
          id: `capability:${option.runtimeCapabilityId}`,
          kind: 'capability',
          capability,
          capabilityIds: [option.runtimeCapabilityId!],
        };
      });

      return {
        id: `branch:${moduleSlug}`,
        kind: 'branch',
        label: sorted[0]?.moduleName ?? moduleSlug,
        path: [moduleSlug],
        children,
        capabilityIds: children.flatMap((node) => node.capabilityIds),
      };
    });
}
