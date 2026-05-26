import { z } from 'zod';
import type { Module } from '@/features/master-data/types';

/** First alphanumeric character of the name, lowercased — used as the initial slug seed. */
export function firstSlugSeedFromTenantName(name: string): string {
  const trimmed = name.trim();
  if (!trimmed) return '';
  const match = trimmed.match(/[A-Za-z0-9]/);
  if (!match) return '';
  return match[0].toLowerCase();
}

export function firstZodMessage(error: z.ZodError): string {
  return error.issues[0]?.message ?? 'Validation failed';
}

export function buildChildrenMap(modules: Module[]): Map<string | null, Module[]> {
  const map = new Map<string | null, Module[]>();
  for (const m of modules) {
    const p = m.parent_id;
    if (!map.has(p)) map.set(p, []);
    map.get(p)!.push(m);
  }
  for (const arr of map.values()) {
    arr.sort((a, b) => (a.display_order ?? 0) - (b.display_order ?? 0) || a.name.localeCompare(b.name));
  }
  return map;
}

/** All active descendant module ids (depth-first, excludes `moduleId`). */
export function collectDescendantModuleIds(
  moduleId: string,
  childMap: Map<string | null, Module[]>,
): string[] {
  const ids: string[] = [];
  const walk = (parentId: string) => {
    for (const child of childMap.get(parentId) ?? []) {
      if (!child.is_active || child.is_deleted) continue;
      ids.push(child.id);
      walk(child.id);
    }
  };
  walk(moduleId);
  return ids;
}

function addModuleSubtreeToSet(
  moduleId: string,
  childMap: Map<string | null, Module[]>,
  ids: Set<string>,
): void {
  ids.add(moduleId);
  for (const childId of collectDescendantModuleIds(moduleId, childMap)) {
    ids.add(childId);
  }
}

/** Pre-select active root modules and their full subtrees from the catalog. */
export function defaultEnabledModuleIds(
  modules: Module[],
  childMap: Map<string | null, Module[]>,
): Set<string> {
  const ids = new Set<string>();
  for (const module of modules) {
    if (!module.is_active || module.is_deleted) continue;
    if (module.parent_id !== null) continue;
    addModuleSubtreeToSet(module.id, childMap, ids);
  }
  return ids;
}

/** Module id plus every active descendant (for per-level select-all in the wizard tree). */
export function subtreeModuleIds(
  moduleId: string,
  childMap: Map<string | null, Module[]>,
): string[] {
  return [moduleId, ...collectDescendantModuleIds(moduleId, childMap)];
}

/** Select or clear every module in a catalog subtree. */
export function setModuleSubtreeSelection(
  moduleId: string,
  selected: Set<string>,
  childMap: Map<string | null, Module[]>,
  select: boolean,
): Set<string> {
  const next = new Set(selected);
  for (const id of subtreeModuleIds(moduleId, childMap)) {
    if (select) {
      next.add(id);
    } else {
      next.delete(id);
    }
  }
  return next;
}

export function moduleSubtreeSelectionState(
  moduleId: string,
  selected: Set<string>,
  childMap: Map<string | null, Module[]>,
): { ids: string[]; allSelected: boolean; someSelected: boolean } {
  const ids = subtreeModuleIds(moduleId, childMap);
  const selectedCount = ids.filter((id) => selected.has(id)).length;
  return {
    ids,
    allSelected: ids.length > 0 && selectedCount === ids.length,
    someSelected: selectedCount > 0 && selectedCount < ids.length,
  };
}

/** Toggle a module; selecting a parent selects all descendants, deselecting clears the subtree. */
export function applyModuleToggle(
  moduleId: string,
  selected: Set<string>,
  childMap: Map<string | null, Module[]>,
): Set<string> {
  const next = new Set(selected);
  const subtreeIds = subtreeModuleIds(moduleId, childMap);
  if (next.has(moduleId)) {
    for (const id of subtreeIds) next.delete(id);
  } else {
    for (const id of subtreeIds) next.add(id);
  }
  return next;
}

/** Hide placeholder-like descriptions from the API so the grid stays readable. */
export function moduleDescriptionLine(description: string | null | undefined): string | null {
  const d = description?.trim();
  if (!d || d.length < 2) return null;
  if (/^string$/i.test(d)) return null;
  return d;
}

