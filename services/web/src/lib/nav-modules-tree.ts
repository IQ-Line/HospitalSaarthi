import type { NavModule } from '@/features/master-data/types';

export type NavModuleTreeNode = {
  module: NavModule;
  path: string;
  children: NavModuleTreeNode[];
};

/**
 * Module slug → fixed route prefix regardless of catalog parent (cross-tree anchors).
 * `visitpad-master` is catalogued under Master Data but the SPA lives under `/visitpad`.
 */
const ANCHOR_PATH_BY_SLUG: Record<string, string> = {
  'visitpad-master': '/visitpad',
};

/**
 * Child slug → URL segment under the resolved parent path.
 */
const SEGMENT_BY_SLUG: Record<string, string> = {
  'allergy-reactions': 'reactions',
  'chronic-illnesses': 'chronic-illness',
  rxcolumns: 'rx-columns',
  tenants: 'tenant',
  'user-roles': 'roles',
  'module-permissions': 'module-permissions',
};

function buildChildrenMap(modules: NavModule[]): Map<string | null, NavModule[]> {
  const map = new Map<string | null, NavModule[]>();
  for (const m of modules) {
    const parentId = m.parent_id;
    if (!map.has(parentId)) {
      map.set(parentId, []);
    }
    map.get(parentId)!.push(m);
  }
  for (const siblings of map.values()) {
    siblings.sort((a, b) => a.level - b.level || a.name.localeCompare(b.name));
  }
  return map;
}

function joinPath(base: string, segment: string): string {
  if (!segment) {
    return base;
  }
  const normalizedBase = base.endsWith('/') ? base.slice(0, -1) : base;
  return `${normalizedBase}/${segment}`;
}

/** Human-readable sidebar label from catalog `name`. */
export function formatModuleNavLabel(name: string): string {
  const spaced = name.replace(/_/g, ' ').trim();
  if (!spaced) {
    return name;
  }
  return spaced.replace(/\b\w/g, (char) => char.toUpperCase());
}

/**
 * Builds a nested nav tree from a flat module list.
 * Roots are `parent_id === null`, ordered by `level` then `name`.
 * Only active, non-deleted modules are included.
 */
export function buildNavModuleTree(modules: NavModule[]): NavModuleTreeNode[] {
  const childMap = buildChildrenMap(modules);
  const byId = new Map(modules.map((m) => [m.id, m]));
  const pathById = new Map<string, string>();

  function resolvePath(module: NavModule): string {
    const cached = pathById.get(module.id);
    if (cached !== undefined) {
      return cached;
    }

    let path: string;
    const anchored = ANCHOR_PATH_BY_SLUG[module.slug];
    if (anchored !== undefined) {
      path = anchored;
    } else if (module.parent_id === null) {
      path = `/${module.slug}`;
    } else {
      const parent = byId.get(module.parent_id);
      if (parent === undefined) {
        path = `/${module.slug}`;
      } else {
        const parentPath = resolvePath(parent);
        const segment = SEGMENT_BY_SLUG[module.slug] ?? module.slug;
        path = joinPath(parentPath, segment);
      }
    }

    pathById.set(module.id, path);
    return path;
  }

  function buildLevel(parentId: string | null): NavModuleTreeNode[] {
    const siblings = childMap.get(parentId) ?? [];
    return siblings.map((module) => ({
      module,
      path: resolvePath(module),
      children: buildLevel(module.id),
    }));
  }

  return buildLevel(null);
}
