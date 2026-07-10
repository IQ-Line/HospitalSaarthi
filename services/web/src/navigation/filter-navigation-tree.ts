import { principalHasAnyRole } from '@/lib/principal-roles';
import { principalGrantsCatalogModuleSlugRouteAccess } from '@/lib/catalog-route-access';
import { catalogSlugVariants } from '@/platform/modules/catalog-slug-variants';
import {
  catalogProductSlugsForNode,
  inferRoutePrefixFromRoute,
  principalGrantsNavNodeAccess,
  principalHasL1ProductShellAccess,
  resolveCatalogModuleSlugsForNavRoute,
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
  requiredRolesAny?: readonly string[];
};

function nodeWithInheritedTenantGates(
  node: NavigationNode,
  parent?: NavFilterParentContext,
): NavigationNode {
  if (
    !parent?.requiredModules?.length &&
    !parent?.requiredModulesAny?.length &&
    !parent?.requiredRolesAny?.length
  ) {
    return node;
  }
  return {
    ...node,
    requiredModules: node.requiredModules ?? parent.requiredModules,
    requiredModulesAny: node.requiredModulesAny ?? parent.requiredModulesAny,
    requiredRolesAny: node.requiredRolesAny ?? parent.requiredRolesAny,
  };
}

function passesRoleGate(
  node: NavigationNode,
  ctx: NavFilterContext,
  parent?: NavFilterParentContext,
): boolean {
  if (ctx.bypassCapabilityGates || ctx.isSuperAdmin || ctx.isTenantAdmin) {
    return true;
  }
  const requiredRoles = node.requiredRolesAny ?? parent?.requiredRolesAny;
  if (!requiredRoles?.length) {
    return true;
  }
  return principalHasAnyRole(ctx.principalRoles ?? [], requiredRoles);
}

function passesCapabilityGate(
  node: NavigationNode,
  access: NavCapabilityAccessInput,
  parent: NavFilterParentContext,
): boolean {
  return principalGrantsNavNodeAccess(access, node, parent);
}

function catalogVisibilityScopeHidesNode(
  node: NavigationNode,
  ctx: NavFilterContext,
): boolean {
  // Tenant-admin-only product shells (inventory-supply-masters, …) use explicit flag.
  if (node.tenantAdminOnly && ctx.isTenantAdmin) {
    return false;
  }
  if (!ctx.catalogIndex) {
    return false;
  }
  if (node.tenantAdminOnly) {
    return false;
  }
  const slug = node.catalogModuleSlug ?? resolveSlugFromRoute(node.route);
  if (!slug) {
    return false;
  }
  const entry = ctx.catalogIndex.bySlug.get(slug);
  if (!entry) {
    return false;
  }
  if (ctx.isSuperAdmin || ctx.isTenantAdmin) {
    if (entry.module_kind !== 'product') {
      return false;
    }
    const productSlugs = catalogProductSlugsForNode(node);
    if (productSlugs.length > 0 && ctx.hasAnyCapabilityForProduct?.(productSlugs)) {
      return false;
    }
    if (ctx.navAccess) {
      const routeSlugs = node.route
        ? resolveCatalogModuleSlugsForNavRoute(node.route, {
            routePrefix: inferRoutePrefixFromRoute(node.route),
            catalogModuleSlug: node.catalogModuleSlug,
            catalogIndex: ctx.catalogIndex,
          })
        : [slug];
      if (principalGrantsCatalogModuleSlugRouteAccess(ctx.navAccess.capabilityKeys, routeSlugs)) {
        return false;
      }
      if (principalHasL1ProductShellAccess(ctx.navAccess.capabilityKeys, productSlugs, node.route)) {
        return false;
      }
    }
    return true;
  }
  return entry.visibility_scope === 'superadmin';
}

function resolveSlugFromRoute(route: string | undefined): string | null {
  if (!route) return null;
  const segments = route.split('/').filter(Boolean);
  return segments.length >= 2 ? (segments[segments.length - 1] ?? null) : null;
}

/** Phase 0 pharmacy UI — show sidebar for all principals until Cerbos/tenant gates are wired. */
function isPharmacyOpenNav(node: NavigationNode): boolean {
  return node.id === 'pharmacy' || (node.route?.startsWith('/pharmacy') ?? false);
}

/** Phase 0 inventory UI — show all operational submodules until Cerbos/tenant gates are wired. */
function isInventoryOpenNav(node: NavigationNode): boolean {
  if (node.id === 'inventory') {
    return true;
  }
  const route = node.route;
  return route === '/inventory' || (route?.startsWith('/inventory/') ?? false);
}

export function isNavigationNodeVisible(
  node: NavigationNode,
  ctx: NavFilterContext,
  parent?: NavFilterParentContext,
): boolean {
  if (node.superAdminOnly && !ctx.isSuperAdmin) {
    return false;
  }
  if (node.tenantAdminOnly && !ctx.isTenantAdmin && !ctx.isSuperAdmin) {
    return false;
  }
  if (isPharmacyOpenNav(node)) {
    return true;
  }
  if (isInventoryOpenNav(node)) {
    return true;
  }
  if (!passesRoleGate(node, ctx, parent)) {
    return false;
  }
  if (catalogVisibilityScopeHidesNode(node, ctx)) {
    return false;
  }
  const gatedNode = nodeWithInheritedTenantGates(node, parent);
  if (!passesTenantModuleGate(gatedNode, ctx.enabledModuleSlugs)) {
    return false;
  }
  // Tenant-admin catalog screens (inventory masters, store config) are role-gated, not capability-gated.
  if (node.tenantAdminOnly && ctx.isTenantAdmin) {
    return true;
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
    node.requiredModules?.length ||
    node.requiredModulesAny?.length ||
    node.requiredRolesAny?.length
      ? {
          requiredModules: node.requiredModules,
          requiredModulesAny: node.requiredModulesAny,
          requiredRolesAny: node.requiredRolesAny,
        }
      : {
          requiredModules: parent.requiredModules,
          requiredModulesAny: parent.requiredModulesAny,
          requiredRolesAny: parent.requiredRolesAny,
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
