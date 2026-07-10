import type { ConfiguratorTenant } from './types';

export type TenantTreeRow = ConfiguratorTenant & { depth: number };

/** Tenants in `rootTenantId` plus all descendants (excludes parent and siblings). */
export function filterTenantsToSubtree(
  tenants: ConfiguratorTenant[],
  rootTenantId: string,
): ConfiguratorTenant[] {
  const root = rootTenantId.trim();
  if (!root) return [];

  const byId = new Map(tenants.map((t) => [t.iq_tenant_id, t]));
  if (!byId.has(root)) return [];

  const visible = new Set<string>([root]);
  let frontier = [root];
  while (frontier.length > 0) {
    const next: string[] = [];
    for (const t of tenants) {
      const parentId = t.parent_tenant_id;
      if (parentId && frontier.includes(parentId) && !visible.has(t.iq_tenant_id)) {
        visible.add(t.iq_tenant_id);
        next.push(t.iq_tenant_id);
      }
    }
    frontier = next;
  }

  return tenants.filter((t) => visible.has(t.iq_tenant_id));
}

export interface BuildTenantTreeRowsOptions {
  /** When set, tree starts at this tenant (depth 0) instead of org roots. */
  rootTenantId?: string | null;
}

/** Indented rows for every descendant of `startParentId`, recursively, sorted by name per level. */
function buildIndentedRows(
  tenants: ConfiguratorTenant[],
  startParentId: string | null,
  startDepth: number,
): TenantTreeRow[] {
  const byParent = new Map<string | null, ConfiguratorTenant[]>();
  for (const t of tenants) {
    const key = t.parent_tenant_id ?? null;
    const list = byParent.get(key) ?? [];
    list.push(t);
    byParent.set(key, list);
  }

  const sortByName = (a: ConfiguratorTenant, b: ConfiguratorTenant) =>
    a.name.localeCompare(b.name, undefined, { sensitivity: 'base' });

  const rows: TenantTreeRow[] = [];
  const walk = (parentId: string | null, depth: number) => {
    const children = (byParent.get(parentId) ?? []).sort(sortByName);
    for (const t of children) {
      rows.push({ ...t, depth });
      walk(t.iq_tenant_id, depth + 1);
    }
  };

  walk(startParentId, startDepth);
  return rows;
}

/** Roots first, then child branches indented by depth for the tenant list table. */
export function buildTenantTreeRows(
  tenants: ConfiguratorTenant[],
  options?: BuildTenantTreeRowsOptions,
): TenantTreeRow[] {
  const scopedRoot = options?.rootTenantId?.trim();
  if (scopedRoot) {
    const root = tenants.find((t) => t.iq_tenant_id === scopedRoot);
    if (!root) return [];
    return [{ ...root, depth: 0 }, ...buildIndentedRows(tenants, scopedRoot, 1)];
  }

  return buildIndentedRows(tenants, null, 0);
}

/** All descendants of `parentTenantId` (excludes the parent row itself). */
export function filterTenantDescendants(
  tenants: ConfiguratorTenant[],
  parentTenantId: string,
): ConfiguratorTenant[] {
  return filterTenantsToSubtree(tenants, parentTenantId).filter(
    (t) => t.iq_tenant_id !== parentTenantId,
  );
}

/** Indented tree of every branch under `parentTenantId` (direct and nested). */
export function buildDescendantBranchTreeRows(
  tenants: ConfiguratorTenant[],
  parentTenantId: string,
): TenantTreeRow[] {
  return buildIndentedRows(tenants, parentTenantId, 0);
}
