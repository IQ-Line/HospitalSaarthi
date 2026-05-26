import type { NavigationNode } from '@/navigation/types';
import { visitpadModuleManifest } from './manifests/visitpad.manifest';
import type { ModuleManifest } from './types';

/** Stable children list — avoids new array refs on every compose cache rebuild. */
const VISITPAD_MASTER_NAV_CHILDREN: readonly NavigationNode[] = visitpadModuleManifest.navigation;

/** Catalog L2 group nested under Master Data (not a separate sidebar root). */
export function visitpadMasterNavigationGroup(
  manifest: ModuleManifest = visitpadModuleManifest,
): NavigationNode {
  return {
    id: 'visitpad-master',
    label: 'Visitpad Master',
    icon: manifest.icon ?? 'layers',
    requiredModulesAny: manifest.requiredModulesAny,
    children: VISITPAD_MASTER_NAV_CHILDREN,
  };
}

let composedCache: NavigationNode[] | null = null;
let composedCacheKey = '';

function cacheKey(manifests: readonly ModuleManifest[]): string {
  return manifests.map((m) => m.slug).join('|');
}

/**
 * Converts a module manifest into a navigation tree node (group or leaf).
 */
export function manifestToNavigationNode(manifest: ModuleManifest): NavigationNode {
  const nav = manifest.navigation;
  const tenantGate: Pick<NavigationNode, 'requiredModules' | 'requiredModulesAny'> =
    manifest.tenantScoped === false
      ? {
          requiredModules: undefined,
          requiredModulesAny: manifest.requiredModulesAny,
        }
      : manifest.requiredModulesAny?.length
        ? {
            requiredModules: undefined,
            requiredModulesAny: manifest.requiredModulesAny,
          }
        : {
            requiredModules: [manifest.slug],
            requiredModulesAny: undefined,
          };

  if (nav.length === 1 && !nav[0].children?.length) {
    const leaf = nav[0];
    return {
      ...leaf,
      id: manifest.slug,
      label: manifest.name,
      icon: leaf.icon ?? manifest.icon,
      route: leaf.route,
      search: leaf.search,
      requiredCapabilities: leaf.requiredCapabilities ?? manifest.requiredCapabilities,
      requiredModules: leaf.requiredModules ?? tenantGate.requiredModules,
      requiredModulesAny: leaf.requiredModulesAny ?? tenantGate.requiredModulesAny,
    };
  }

  return {
    id: manifest.slug,
    label: manifest.name,
    icon: manifest.icon,
    requiredCapabilities: manifest.requiredCapabilities,
    ...tenantGate,
    children: nav,
  };
}

/**
 * Builds the shell navigation tree from registered module manifests.
 * Cached until registry contents change (register at app bootstrap).
 */
export function composeNavigationManifest(manifests: readonly ModuleManifest[]): NavigationNode[] {
  const key = cacheKey(manifests);
  if (composedCache && composedCacheKey === key) {
    return composedCache;
  }

  const visitpadManifest = manifests.find((m) => m.slug === 'visitpad');
  const nodes: NavigationNode[] = [];

  for (const manifest of manifests) {
    if (manifest.slug === 'visitpad') {
      continue;
    }

    let node = manifestToNavigationNode(manifest);
    if (manifest.slug === 'master-data' && visitpadManifest) {
      node = {
        ...node,
        children: [...(node.children ?? []), visitpadMasterNavigationGroup(visitpadManifest)],
      };
    }
    nodes.push(node);
  }

  composedCache = nodes;
  composedCacheKey = key;
  return nodes;
}

/** Bust compose cache when manifests are registered dynamically (plugins). */
export function invalidateComposedNavigationCache(): void {
  composedCache = null;
  composedCacheKey = '';
}
