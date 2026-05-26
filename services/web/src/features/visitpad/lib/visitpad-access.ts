import { principalGrantsCatalogRouteAccess } from '@/lib/catalog-route-access';
import {
  inferRoutePathSegmentAfterPrefix,
  resolveCatalogModuleSlugsForNavRoute,
} from '@/navigation/nav-capability-access';
import { visitpadModuleManifest } from '@/platform/modules/manifests/visitpad.manifest';
import { getModuleCatalogIndexFromCache } from '@/platform/modules/module-catalog';
import type { NavigationNode } from '@/navigation/types';
import type { VisitpadPrimaryTab } from '@/features/visitpad/visitpad-nav-model';

/** Master Data catalog gates for Visitpad routes (L1 ``master-data`` and L2 ``visitpad-master``). */
export const VISITPAD_CATALOG_PRODUCT_SLUGS = ['master-data', 'visitpad-master'] as const;
export const VISITPAD_ROUTE_PREFIX = visitpadModuleManifest.routePrefix;

/** Primary shell tabs (horizontal); each group maps to manifest leaf node ids. */
export const visitpadPrimaryTabGroups: ReadonlyArray<{
  id: VisitpadPrimaryTab;
  label: string;
  to: string;
  manifestNodeIds: readonly string[];
}> = [
  { id: 'units', label: 'Units', to: '/visitpad/units', manifestNodeIds: ['visitpad-units', 'visitpad-conversions'] },
  { id: 'vitals', label: 'Vitals', to: '/visitpad/vitals', manifestNodeIds: ['visitpad-vitals'] },
  {
    id: 'chief-complaints',
    label: 'Chief complaints',
    to: '/visitpad/chief-complaints',
    manifestNodeIds: ['visitpad-chief-complaints'],
  },
  { id: 'diagnoses', label: 'Diagnosis', to: '/visitpad/diagnoses', manifestNodeIds: ['visitpad-diagnoses'] },
  {
    id: 'allergies',
    label: 'Allergies',
    to: '/visitpad/allergens',
    manifestNodeIds: ['visitpad-allergens', 'visitpad-reactions'],
  },
  {
    id: 'rx-columns',
    label: 'Rx columns',
    to: '/visitpad/rx-columns',
    manifestNodeIds: ['visitpad-rx-columns'],
  },
  { id: 'medicines', label: 'Medicines', to: '/visitpad/medicines', manifestNodeIds: ['visitpad-medicines'] },
  {
    id: 'chronic-illness',
    label: 'Chronic illness',
    to: '/visitpad/chronic-illness',
    manifestNodeIds: ['visitpad-chronic-illness'],
  },
  { id: 'procedures', label: 'Procedures', to: '/visitpad/procedures', manifestNodeIds: ['visitpad-procedures'] },
  { id: 'vaccines', label: 'Vaccines', to: '/visitpad/vaccines', manifestNodeIds: ['visitpad-vaccines'] },
  {
    id: 'manufacturers',
    label: 'Manufacturers',
    to: '/visitpad/manufacturers',
    manifestNodeIds: ['visitpad-manufacturers'],
  },
];

export function getVisitpadManifestNode(nodeId: string): NavigationNode | undefined {
  return visitpadModuleManifest.navigation.find((node) => node.id === nodeId);
}

export function principalGrantsVisitpadRouteAccess(
  capabilityKeys: ReadonlySet<string>,
  route: string,
  catalogModuleSlug?: string,
): boolean {
  return principalGrantsCatalogRouteAccess(capabilityKeys, route, {
    catalogProductSlugs: VISITPAD_CATALOG_PRODUCT_SLUGS,
    routePrefix: VISITPAD_ROUTE_PREFIX,
    catalogModuleSlug,
  });
}

export function principalGrantsVisitpadManifestNodeAccess(
  capabilityKeys: ReadonlySet<string>,
  nodeId: string,
): boolean {
  const node = getVisitpadManifestNode(nodeId);
  if (!node?.route) {
    return false;
  }
  return principalGrantsVisitpadRouteAccess(capabilityKeys, node.route, node.catalogModuleSlug);
}

export function principalGrantsVisitpadPrimaryTabAccess(
  capabilityKeys: ReadonlySet<string>,
  tabId: VisitpadPrimaryTab,
): boolean {
  const group = visitpadPrimaryTabGroups.find((g) => g.id === tabId);
  if (!group) {
    return false;
  }
  return group.manifestNodeIds.some((nodeId) =>
    principalGrantsVisitpadManifestNodeAccess(capabilityKeys, nodeId),
  );
}

/** Catalog L2 slug for a manifest leaf (explicit override or route segment). */
export function catalogModuleSlugForVisitpadManifestNode(nodeId: string): string {
  const node = getVisitpadManifestNode(nodeId);
  if (node?.catalogModuleSlug) {
    return node.catalogModuleSlug;
  }
  if (node?.route) {
    const catalogIndex = getModuleCatalogIndexFromCache();
    const slugs = resolveCatalogModuleSlugsForNavRoute(node.route, {
      routePrefix: VISITPAD_ROUTE_PREFIX,
      catalogIndex,
    });
    if (slugs[0]) {
      return slugs[0];
    }
    const segment = inferRoutePathSegmentAfterPrefix(node.route, VISITPAD_ROUTE_PREFIX);
    if (segment) {
      return segment;
    }
  }
  return nodeId.replace(/^visitpad-/, '');
}

export function catalogModuleSlugForVisitpadPrimaryTab(tabId: VisitpadPrimaryTab): string {
  const group = visitpadPrimaryTabGroups.find((g) => g.id === tabId);
  const nodeId = group?.manifestNodeIds[0];
  return nodeId ? catalogModuleSlugForVisitpadManifestNode(nodeId) : tabId;
}

export function filterVisitpadPrimaryTabGroups(capabilityKeys: ReadonlySet<string>) {
  return visitpadPrimaryTabGroups.filter((group) =>
    principalGrantsVisitpadPrimaryTabAccess(capabilityKeys, group.id),
  );
}

/** Primary tab group that owns a Visitpad leaf route, if any. */
export function visitpadPrimaryTabForRoute(route: string): VisitpadPrimaryTab | null {
  const group = visitpadPrimaryTabGroups.find((g) =>
    g.manifestNodeIds.some((nodeId) => getVisitpadManifestNode(nodeId)?.route === route),
  );
  return group?.id ?? null;
}

/** First permitted leaf route in a primary tab group (manifest order within the group). */
export function firstAccessibleVisitpadPathInPrimaryTab(
  capabilityKeys: ReadonlySet<string>,
  tabId: VisitpadPrimaryTab,
): string | null {
  const group = visitpadPrimaryTabGroups.find((g) => g.id === tabId);
  if (!group) {
    return null;
  }
  for (const nodeId of group.manifestNodeIds) {
    if (principalGrantsVisitpadManifestNodeAccess(capabilityKeys, nodeId)) {
      const node = getVisitpadManifestNode(nodeId);
      if (node?.route) {
        return node.route;
      }
    }
  }
  return null;
}

/** Link target for a primary tab: first accessible leaf in the group, not always the default `to`. */
export function resolveVisitpadPrimaryTabLandingRoute(
  capabilityKeys: ReadonlySet<string>,
  tabId: VisitpadPrimaryTab,
): string {
  return firstAccessibleVisitpadPathInPrimaryTab(capabilityKeys, tabId) ?? visitpadPrimaryTabGroups.find((g) => g.id === tabId)?.to ?? '/visitpad';
}

export function getVisitpadManifestNodeByRoute(route: string): NavigationNode | undefined {
  return visitpadModuleManifest.navigation.find((node) => node.route === route);
}

export function filterVisitpadManifestNodesByAccess(
  nodeIds: readonly string[],
  capabilityKeys: ReadonlySet<string>,
): NavigationNode[] {
  return nodeIds
    .map((id) => getVisitpadManifestNode(id))
    .filter((node): node is NavigationNode => Boolean(node?.route))
    .filter((node) => principalGrantsVisitpadRouteAccess(capabilityKeys, node.route!, node.catalogModuleSlug));
}
