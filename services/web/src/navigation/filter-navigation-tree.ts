import type { NavFilterContext, NavigationNode } from './types';

function passesTenantModuleGate(
  node: NavigationNode,
  enabledModuleSlugs: ReadonlySet<string> | null,
): boolean {
  if (enabledModuleSlugs === null) {
    return true;
  }

  if (node.requiredModules?.length) {
    if (!node.requiredModules.every((slug) => enabledModuleSlugs.has(slug))) {
      return false;
    }
  }

  if (node.requiredModulesAny?.length) {
    if (!node.requiredModulesAny.some((slug) => enabledModuleSlugs.has(slug))) {
      return false;
    }
  }

  return true;
}

function passesCapabilityGate(node: NavigationNode, ctx: NavFilterContext): boolean {
  if (node.requiredCapabilitiesAll?.length) {
    return ctx.hasAllCapabilities(node.requiredCapabilitiesAll);
  }

  if (node.requiredCapabilities?.length) {
    return ctx.hasAnyCapability(node.requiredCapabilities);
  }

  return true;
}

export function isNavigationNodeVisible(node: NavigationNode, ctx: NavFilterContext): boolean {
  if (!passesTenantModuleGate(node, ctx.enabledModuleSlugs)) {
    return false;
  }
  return passesCapabilityGate(node, ctx);
}

/**
 * Recursively filters the manifest: drops nodes that fail gates or have no visible leaves.
 */
export function filterNavigationTree(
  nodes: readonly NavigationNode[],
  ctx: NavFilterContext,
): NavigationNode[] {
  const result: NavigationNode[] = [];

  for (const node of nodes) {
    const filtered = filterNavigationNode(node, ctx);
    if (filtered) {
      result.push(filtered);
    }
  }

  return result;
}

function filterNavigationNode(
  node: NavigationNode,
  ctx: NavFilterContext,
): NavigationNode | null {
  const filteredChildren = node.children
    ? filterNavigationTree(node.children, ctx)
    : undefined;

  if (!isNavigationNodeVisible(node, ctx)) {
    return null;
  }

  const hasVisibleChildren = (filteredChildren?.length ?? 0) > 0;

  if (!node.route && !hasVisibleChildren) {
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
