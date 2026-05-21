import { catalogSlugVariants } from '@/platform/modules/catalog-slug-variants';
import {
  catalogProductSlugsForNode,
  inferRoutePrefixFromRoute,
  principalGrantsNavNodeAccess,
  type NavCapabilityAccessInput,
} from './nav-capability-access';
import type { NavFilterContext, NavigationNode } from './types';

function tenantHasModuleSlug(enabledModuleSlugs: ReadonlySet<string>, slug: string): boolean {
  return catalogSlugVariants(slug).some((variant) => enabledModuleSlugs.has(variant));
}

function hasTenantModuleGate(node: NavigationNode): boolean {
  return Boolean(node.requiredModules?.length || node.requiredModulesAny?.length);
}

function passesTenantModuleGate(
  node: NavigationNode,
  enabledModuleSlugs: ReadonlySet<string> | null,
): boolean {
  if (!hasTenantModuleGate(node)) {
    return true;
  }

  if (enabledModuleSlugs === null) {
    return false;
  }

  if (node.requiredModules?.length) {
    if (!node.requiredModules.every((slug) => tenantHasModuleSlug(enabledModuleSlugs, slug))) {
      return false;
    }
  }

  if (node.requiredModulesAny?.length) {
    if (!node.requiredModulesAny.some((slug) => tenantHasModuleSlug(enabledModuleSlugs, slug))) {
      return false;
    }
  }

  return true;
}

type NavFilterParentContext = {
  parentProductSlugs?: readonly string[];
  routePrefix?: string;
  /** Tenant module gates inherited from an ancestor group node. */
  requiredModules?: readonly string[];
  requiredModulesAny?: readonly string[];
};

function nodeWithInheritedTenantGates(
  node: NavigationNode,
  parent?: NavFilterParentContext,
): NavigationNode {
  if (!parent?.requiredModules?.length && !parent?.requiredModulesAny?.length) {
    return node;
  }
  return {
    ...node,
    requiredModules: node.requiredModules ?? parent.requiredModules,
    requiredModulesAny: node.requiredModulesAny ?? parent.requiredModulesAny,
  };
}

function passesCapabilityGate(
  node: NavigationNode,
  access: NavCapabilityAccessInput,
  parent: NavFilterParentContext,
): boolean {
  return principalGrantsNavNodeAccess(access, node, parent);
}

export function isNavigationNodeVisible(
  node: NavigationNode,
  ctx: NavFilterContext,
  parent?: NavFilterParentContext,
): boolean {
  const gatedNode = nodeWithInheritedTenantGates(node, parent);
  if (!passesTenantModuleGate(gatedNode, ctx.enabledModuleSlugs)) {
    return false;
  }
  if (!ctx.navAccess) {
    return false;
  }
  return passesCapabilityGate(node, ctx.navAccess, parent ?? {});
}

/**
 * Recursively filters the manifest: drops nodes that fail gates or have no visible leaves.
 */
export function filterNavigationTree(
  nodes: readonly NavigationNode[],
  ctx: NavFilterContext,
  parent?: NavFilterParentContext,
): NavigationNode[] {
  const result: NavigationNode[] = [];

  for (const node of nodes) {
    const filtered = filterNavigationNode(node, ctx, parent);
    if (filtered) {
      result.push(filtered);
    }
  }

  return result;
}

function filterNavigationNode(
  node: NavigationNode,
  ctx: NavFilterContext,
  parent: NavFilterParentContext = {},
): NavigationNode | null {
  const productSlugs = catalogProductSlugsForNode(node);
  const tenantGate =
    node.requiredModules?.length || node.requiredModulesAny?.length
      ? {
          requiredModules: node.requiredModules,
          requiredModulesAny: node.requiredModulesAny,
        }
      : {
          requiredModules: parent.requiredModules,
          requiredModulesAny: parent.requiredModulesAny,
        };
  const childParent: NavFilterParentContext = {
    parentProductSlugs:
      productSlugs.length > 0 ? productSlugs : parent.parentProductSlugs,
    routePrefix: node.route
      ? inferRoutePrefixFromRoute(node.route)
      : parent.routePrefix,
    ...tenantGate,
  };

  const filteredChildren = node.children
    ? filterNavigationTree(node.children, ctx, childParent)
    : undefined;

  const hasVisibleChildren = (filteredChildren?.length ?? 0) > 0;

  if (!isNavigationNodeVisible(node, ctx, parent)) {
    if (!hasVisibleChildren) {
      return null;
    }
  } else if (!node.route && !hasVisibleChildren) {
    return null;
  }

  return {
    ...node,
    children: filteredChildren?.length ? filteredChildren : undefined,
  };
}

function firstRoutableDescendant(
  node: NavigationNode,
): Pick<NavigationNode, 'route'> | undefined {
  if (node.route) {
    return { route: node.route };
  }
  for (const child of node.children ?? []) {
    const found = firstRoutableDescendant(child);
    if (found?.route) {
      return found;
    }
  }
  return undefined;
}

/** Top-level modules for dashboard discovery (one card per manifest root, excluding dashboard). */
export function collectModuleDiscoveryEntries(
  nodes: readonly NavigationNode[],
): Array<Pick<NavigationNode, 'id' | 'label' | 'route' | 'icon'>> {
  return nodes
    .filter((node) => node.id !== 'dashboard')
    .map((node) => {
      const route = node.route ?? firstRoutableDescendant(node)?.route;
      if (!route) return null;
      return { id: node.id, label: node.label, route, icon: node.icon };
    })
    .filter((entry): entry is NonNullable<typeof entry> => entry !== null);
}
