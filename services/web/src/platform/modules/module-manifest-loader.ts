import type { NavigationNode } from '@/navigation/types';
import type { ModuleManifest } from './types';

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

  const nodes = manifests.map((manifest) => manifestToNavigationNode(manifest));
  composedCache = nodes;
  composedCacheKey = key;
  return nodes;
}

/** Bust compose cache when manifests are registered dynamically (plugins). */
export function invalidateComposedNavigationCache(): void {
  composedCache = null;
  composedCacheKey = '';
}
