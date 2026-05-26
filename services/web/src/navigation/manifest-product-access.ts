import { getRegisteredModuleManifests } from '@/platform/modules/module-registry';
import type { ModuleManifest } from '@/platform/modules/types';
import {
  buildPrincipalCapabilityModuleSegments,
  capabilityKeysGrantModuleSlugAccess,
  resolveCatalogModuleSlugsForNavRoute,
} from './nav-capability-access';
import type { NavigationNode } from './types';

function manifestMatchesProduct(
  manifest: ModuleManifest,
  catalogProductSlugs: readonly string[],
): boolean {
  const productSet = new Set(catalogProductSlugs);
  if (manifest.requiredModulesAny?.some((slug) => productSet.has(slug))) {
    return true;
  }
  if (manifest.requiredModules?.length && manifest.requiredModules.every((slug) => productSet.has(slug))) {
    return true;
  }
  return productSet.has(manifest.slug);
}

function walkManifestNavRoutes(
  nodes: readonly NavigationNode[],
  routePrefix: string,
  capabilityModuleSegments: ReadonlySet<string>,
): boolean {
  for (const node of nodes) {
    if (node.route) {
      const moduleSlugs = resolveCatalogModuleSlugsForNavRoute(node.route, {
        routePrefix,
        catalogModuleSlug: node.catalogModuleSlug,
        catalogIndex: null,
      });
      if (capabilityKeysGrantModuleSlugAccess(capabilityModuleSegments, moduleSlugs)) {
        return true;
      }
    }
    if (node.children?.length) {
      if (walkManifestNavRoutes(node.children, routePrefix, capabilityModuleSegments)) {
        return true;
      }
    }
  }
  return false;
}

/**
 * Product access when the principal holds any L2+ key for a registered manifest route
 * (works before the Master Data catalog query has hydrated).
 */
export function capabilityKeysGrantProductAccessFromManifest(
  capabilityKeys: ReadonlySet<string>,
  catalogProductSlugs: readonly string[],
): boolean {
  if (catalogProductSlugs.length === 0 || capabilityKeys.size === 0) {
    return false;
  }

  // Manifests are registered once at app bootstrap — never invalidate compose cache here.
  const capabilityModuleSegments = buildPrincipalCapabilityModuleSegments(capabilityKeys);

  for (const manifest of getRegisteredModuleManifests()) {
    if (!manifestMatchesProduct(manifest, catalogProductSlugs)) {
      continue;
    }
    if (walkManifestNavRoutes(manifest.navigation, manifest.routePrefix, capabilityModuleSegments)) {
      return true;
    }
  }

  return false;
}
