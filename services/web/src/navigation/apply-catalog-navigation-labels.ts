import { catalogSlugVariants } from '@/platform/modules/catalog-slug-variants';
import {
  isCatalogL1Module,
  type ModuleCatalogIndex,
} from '@/platform/modules/use-enabled-tenant-modules';
import type { NavigationNode } from './types';

function buildL1CatalogNameBySlug(index: ModuleCatalogIndex): Map<string, string> {
  const names = new Map<string, string>();
  for (const entry of index.bySlug.values()) {
    if (!isCatalogL1Module(entry)) {
      continue;
    }
    for (const variant of catalogSlugVariants(entry.slug)) {
      names.set(variant, entry.name);
    }
  }
  return names;
}

/** Resolves Master Data L1 display name for a composed module root (sidebar group). */
export function catalogDisplayNameForModuleRoot(
  node: NavigationNode,
  l1NamesBySlug: ReadonlyMap<string, string>,
): string | undefined {
  for (const variant of catalogSlugVariants(node.id)) {
    const name = l1NamesBySlug.get(variant);
    if (name) {
      return name;
    }
  }

  return undefined;
}

/**
 * Overrides top-level module group labels from `global_master.modules` (e.g. Onboarding for `configurator`).
 * Child route labels (Visitpad → Vaccines) stay from the SPA manifest.
 */
export function applyCatalogNavigationLabels(
  nodes: readonly NavigationNode[],
  index: ModuleCatalogIndex | null,
): NavigationNode[] {
  if (!index) {
    return [...nodes];
  }

  const l1NamesBySlug = buildL1CatalogNameBySlug(index);

  return nodes.map((node) => {
    const catalogName = catalogDisplayNameForModuleRoot(node, l1NamesBySlug);
    if (!catalogName) {
      return node;
    }
    return { ...node, label: catalogName };
  });
}
