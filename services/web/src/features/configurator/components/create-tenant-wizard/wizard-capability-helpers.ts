import type { Capability } from '@/features/user-management/types';
import type { Module } from '@/features/master-data/types';

export function normalizeSlug(slug: string): string {
  return slug.trim().toLowerCase().replace(/_/g, '-');
}

function buildChildrenByParentId(modules: Module[]): Map<string, Module[]> {
  const byParent = new Map<string, Module[]>();
  for (const module of modules) {
    const parentKey = module.parent_id ?? '';
    const list = byParent.get(parentKey) ?? [];
    list.push(module);
    byParent.set(parentKey, list);
  }
  return byParent;
}

/** Include every descendant module when a parent is enabled (L1 tenant_modules → L2+ permissions). */
export function expandModuleIdsWithDescendants(
  enabledModuleIds: ReadonlySet<string>,
  modules: Module[],
): Set<string> {
  if (enabledModuleIds.size === 0 || modules.length === 0) {
    return new Set(enabledModuleIds);
  }

  const byId = new Map(modules.map((module) => [module.id, module]));
  const childrenByParentId = buildChildrenByParentId(modules);
  const expanded = new Set<string>();

  function walk(moduleId: string): void {
    expanded.add(moduleId);
    for (const child of childrenByParentId.get(moduleId) ?? []) {
      if (!child.is_active || child.is_deleted) continue;
      walk(child.id);
    }
  }

  for (const id of enabledModuleIds) {
    if (byId.has(id)) {
      walk(id);
    } else {
      expanded.add(id);
    }
  }

  return expanded;
}

export function expandModuleSlugsWithDescendants(
  enabledSlugs: readonly string[],
  modules: Module[],
): Set<string> {
  const slugToId = new Map(modules.map((module) => [normalizeSlug(module.slug), module.id]));
  const rootIds = new Set<string>();
  for (const slug of enabledSlugs) {
    const id = slugToId.get(normalizeSlug(slug));
    if (id !== undefined) {
      rootIds.add(id);
    }
  }
  const expandedIds = expandModuleIdsWithDescendants(rootIds, modules);
  return new Set(moduleSlugsForIds(expandedIds, modules));
}

export function moduleSlugsForIds(moduleIds: ReadonlySet<string>, modules: Module[]): string[] {
  const byId = new Map(modules.map((m) => [m.id, m]));
  const slugs = new Set<string>();
  for (const id of moduleIds) {
    const slug = byId.get(id)?.slug;
    if (slug) slugs.add(normalizeSlug(slug));
  }
  return [...slugs];
}

/**
 * Limit the UM runtime catalog to rows synced from Master Data for enabled module slugs.
 * Matching uses `source_module_slug` only (set by catalog sync).
 */
export function scopeRuntimeCapabilitiesToEnabledSlugs(
  capabilities: Capability[],
  enabledModuleSlugs: string[],
  modules: Module[] = [],
): Capability[] {
  const slugSet =
    modules.length > 0
      ? expandModuleSlugsWithDescendants(enabledModuleSlugs, modules)
      : new Set(enabledModuleSlugs.map(normalizeSlug));

  return capabilities.filter((capability) => {
    if (!capability.is_active) return false;
    const source = capability.source_module_slug?.trim();
    if (!source) return false;
    return slugSet.has(normalizeSlug(source));
  });
}

/** Human-readable module names for modules enabled in step 2. */
export function enabledModuleLabels(
  enabledModuleIds: Set<string>,
  modules: Module[],
): string[] {
  const byId = new Map(modules.map((m) => [m.id, m]));
  return [...enabledModuleIds]
    .map((id) => byId.get(id)?.name)
    .filter((name): name is string => typeof name === 'string' && name.length > 0)
    .sort((a, b) => a.localeCompare(b));
}

export function toRoleCode(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}
