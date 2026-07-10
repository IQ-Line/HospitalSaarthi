import { normalizeModuleSlug } from "./module-slug.js";

/** Minimal Master Data module row for tree walks (no hardcoded slugs). */
export type CatalogModuleRef = {
  readonly id: string;
  readonly slug: string;
  readonly parent_id: string | null;
  readonly level?: number;
};

/** Active L1 product module in `master_global.modules` (matches seed `level = 1`). */
export function isCatalogL1Module(module: Pick<CatalogModuleRef, "level" | "parent_id">): boolean {
  return module.level === 1 && module.parent_id === null;
}

function buildChildrenByParentId(
  modules: readonly CatalogModuleRef[],
): Map<string, CatalogModuleRef[]> {
  const byParent = new Map<string, CatalogModuleRef[]>();
  for (const module of modules) {
    const parentKey = module.parent_id ?? "";
    const list = byParent.get(parentKey) ?? [];
    list.push(module);
    byParent.set(parentKey, list);
  }
  return byParent;
}

function collectDescendantIds(
  rootId: string,
  childrenByParentId: Map<string, CatalogModuleRef[]>,
): string[] {
  const ids: string[] = [];
  const stack = [rootId];
  while (stack.length > 0) {
    const id = stack.pop()!;
    ids.push(id);
    for (const child of childrenByParentId.get(id) ?? []) {
      stack.push(child.id);
    }
  }
  return ids;
}

/**
 * Expands enabled module ids to include every descendant in the Master Data catalog tree.
 * Used when L1 `tenant_modules` rows imply L2+ `module_permissions` / runtime capabilities.
 */
export function expandModuleIdsWithDescendants(
  enabledModuleIds: ReadonlySet<string> | readonly string[],
  modules: readonly CatalogModuleRef[],
): Set<string> {
  const roots = enabledModuleIds instanceof Set ? enabledModuleIds : new Set(enabledModuleIds);
  if (roots.size === 0 || modules.length === 0) {
    return new Set(roots);
  }

  const byId = new Map(modules.map((module) => [module.id, module]));
  const childrenByParentId = buildChildrenByParentId(modules);
  const expanded = new Set<string>();

  for (const id of roots) {
    if (!byId.has(id)) {
      expanded.add(id);
      continue;
    }
    for (const descendantId of collectDescendantIds(id, childrenByParentId)) {
      expanded.add(descendantId);
    }
  }

  return expanded;
}

/**
 * Expands catalog module slugs to include descendant module slugs (same tree walk by id).
 */
export function expandModuleSlugsWithDescendants(
  enabledSlugs: readonly string[],
  modules: readonly CatalogModuleRef[],
): Set<string> {
  if (enabledSlugs.length === 0 || modules.length === 0) {
    return new Set(enabledSlugs.map((slug) => normalizeModuleSlug(slug)));
  }

  const slugToId = new Map<string, string>();
  for (const module of modules) {
    slugToId.set(normalizeModuleSlug(module.slug), module.id);
  }

  const rootIds = new Set<string>();
  for (const slug of enabledSlugs) {
    const id = slugToId.get(normalizeModuleSlug(slug));
    if (id !== undefined) {
      rootIds.add(id);
    }
  }

  const expandedIds = expandModuleIdsWithDescendants(rootIds, modules);
  const expandedSlugs = new Set<string>();
  const byId = new Map(modules.map((module) => [module.id, module]));

  for (const id of expandedIds) {
    const module = byId.get(id);
    if (module) {
      expandedSlugs.add(normalizeModuleSlug(module.slug));
    }
  }

  for (const slug of enabledSlugs) {
    expandedSlugs.add(normalizeModuleSlug(slug));
  }

  return expandedSlugs;
}

export function moduleSlugsForIds(
  moduleIds: ReadonlySet<string> | readonly string[],
  modules: readonly CatalogModuleRef[],
): string[] {
  const byId = new Map(modules.map((module) => [module.id, module]));
  const slugs = new Set<string>();
  for (const id of moduleIds) {
    const slug = byId.get(id)?.slug;
    if (slug) {
      slugs.add(normalizeModuleSlug(slug));
    }
  }
  return [...slugs];
}
