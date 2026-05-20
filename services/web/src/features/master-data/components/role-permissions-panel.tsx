import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ChevronDown, ChevronRight } from 'lucide-react';
import type { UseFormReturn } from 'react-hook-form';
import { Badge } from '@pulse/ui/badge';
import { Checkbox } from '@pulse/ui/checkbox';
import { apiClientGlobalCatalogRead } from '@/lib/api-client';
import { buildNavModuleTree, type NavModuleTreeNode } from '@/lib/nav-modules-tree';
import { useTenantModules } from '@/features/configurator/api';
import { masterDataKeys, useModuleNavPermissionsBatch } from '@/features/master-data/api';
import type {
  NavModule,
  NavModulePermissionLink,
  NavModuleListResponse,
  SystemRoleFormInput,
  SystemRoleFormValues,
} from '@/features/master-data/types';

const MODULES_BASE = '/api/v1/master-data/modules';
const NAV_MODULES_PATH = `${MODULES_BASE}/nav`;

/** UI columns mapped to platform permission slugs (Write → create, Edit → edit). */
const PERMISSION_COLUMNS = [
  { label: 'Read', slug: 'read' },
  { label: 'Write', slug: 'create' },
  { label: 'Edit', slug: 'edit' },
] as const;

function filterNavModulesForTenantEntitlements(
  allModules: NavModule[],
  enabledModuleIds: Iterable<string>,
): NavModule[] {
  if (allModules.length === 0) {
    return [];
  }

  const byId = new Map(allModules.map((m) => [m.id, m]));
  const childrenByParent = new Map<string | null, NavModule[]>();
  for (const mod of allModules) {
    const list = childrenByParent.get(mod.parent_id) ?? [];
    list.push(mod);
    childrenByParent.set(mod.parent_id, list);
  }

  const includeIds = new Set<string>();

  const addDescendants = (moduleId: string) => {
    const stack = [moduleId];
    while (stack.length > 0) {
      const id = stack.pop()!;
      if (includeIds.has(id)) {
        continue;
      }
      includeIds.add(id);
      for (const child of childrenByParent.get(id) ?? []) {
        stack.push(child.id);
      }
    }
  };

  for (const enabledId of enabledModuleIds) {
    let current = byId.get(enabledId);
    while (current) {
      includeIds.add(current.id);
      current = current.parent_id ? byId.get(current.parent_id) : undefined;
    }
    addDescendants(enabledId);
  }

  return allModules.filter((m) => includeIds.has(m.id));
}

function collectDescendantModuleIds(node: NavModuleTreeNode): string[] {
  const ids = [node.module.id];
  for (const child of node.children) {
    ids.push(...collectDescendantModuleIds(child));
  }
  return ids;
}

function collectJunctionIdsForModules(
  moduleIds: string[],
  permissionsByModuleId: Map<string, NavModulePermissionLink[]>,
): string[] {
  const junctionIds: string[] = [];
  for (const moduleId of moduleIds) {
    for (const link of permissionsByModuleId.get(moduleId) ?? []) {
      junctionIds.push(link.id);
    }
  }
  return junctionIds;
}

function getBranchCheckedState(
  junctionIds: string[],
  selected: Set<string>,
): boolean | 'indeterminate' {
  if (junctionIds.length === 0) {
    return false;
  }
  const selectedCount = junctionIds.filter((id) => selected.has(id)).length;
  if (selectedCount === 0) {
    return false;
  }
  if (selectedCount === junctionIds.length) {
    return true;
  }
  return 'indeterminate';
}

type RolePermissionsPanelProps = {
  form: UseFormReturn<SystemRoleFormInput, unknown, SystemRoleFormValues>;
  enabled: boolean;
  /** Configurator tenant id — module list comes from ``GET /tenants/{id}/modules``. */
  configuratorTenantId?: string;
};

export function RolePermissionsPanel({
  form,
  enabled,
  configuratorTenantId,
}: RolePermissionsPanelProps) {
  const [expandedIds, setExpandedIds] = useState<Set<string>>(() => new Set());

  const useTenantEntitlements = !!configuratorTenantId;

  const { data: tenantModsRes, isLoading: tenantModsLoading } = useTenantModules(
    configuratorTenantId ?? '',
    { enabled: enabled && useTenantEntitlements, isActive: true },
  );

  const enabledTenantModuleIds = useMemo(
    () =>
      (tenantModsRes?.data ?? [])
        .filter((row) => row.is_active)
        .map((row) => row.module_id),
    [tenantModsRes?.data],
  );

  const { data: platformNavRes, isLoading: platformNavLoading } = useQuery({
    queryKey: masterDataKeys.navModules(false, 'platform'),
    queryFn: () => apiClientGlobalCatalogRead<NavModuleListResponse>(NAV_MODULES_PATH),
    enabled,
    staleTime: 60_000,
  });

  const permissionFetchIds = useMemo(() => {
    const catalog = platformNavRes?.data ?? [];
    if (!useTenantEntitlements) {
      return catalog.filter((m) => m.level >= 2).map((m) => m.id);
    }
    if (catalog.length > 0) {
      const entitled = filterNavModulesForTenantEntitlements(catalog, enabledTenantModuleIds);
      const entitledIds = entitled.map((m) => m.id);
      if (entitledIds.length > 0) {
        return entitledIds;
      }
    }
    return enabledTenantModuleIds;
  }, [useTenantEntitlements, platformNavRes?.data, enabledTenantModuleIds]);

  const {
    data: permissionsBatchRes,
    isLoading: permissionsLoading,
  } = useModuleNavPermissionsBatch(permissionFetchIds, {
    enabled: enabled && permissionFetchIds.length > 0,
  });

  const permissionsByModuleId = useMemo(() => {
    const map = new Map<string, NavModulePermissionLink[]>();
    for (const bundle of permissionsBatchRes?.data ?? []) {
      map.set(bundle.module.id, bundle.permissions);
    }
    return map;
  }, [permissionsBatchRes?.data]);

  const modulesForTree = useMemo((): NavModule[] => {
    if (!useTenantEntitlements) {
      return platformNavRes?.data ?? [];
    }

    const byId = new Map<string, NavModule>();
    const catalog = platformNavRes?.data ?? [];
    if (catalog.length > 0) {
      for (const mod of filterNavModulesForTenantEntitlements(catalog, enabledTenantModuleIds)) {
        byId.set(mod.id, mod);
      }
    }

    for (const bundle of permissionsBatchRes?.data ?? []) {
      byId.set(bundle.module.id, bundle.module);
    }

    if (byId.size > 0) {
      return [...byId.values()];
    }

    return enabledTenantModuleIds.map((id) => ({
      id,
      iq_tenant_id: null,
      parent_id: null,
      name: id.slice(0, 8),
      slug: id.slice(0, 8),
      category: 'administrative' as const,
      level: 1,
      icon: null,
    }));
  }, [
    useTenantEntitlements,
    platformNavRes?.data,
    enabledTenantModuleIds,
    permissionsBatchRes?.data,
  ]);

  const navLoading = useTenantEntitlements
    ? tenantModsLoading || platformNavLoading
    : platformNavLoading;

  const navTree = useMemo(() => buildNavModuleTree(modulesForTree), [modulesForTree]);

  const selectedIds = form.watch('module_permission_ids');
  const selectedSet = useMemo(() => new Set(selectedIds), [selectedIds]);

  const setSelected = (next: Set<string>) => {
    form.setValue('module_permission_ids', [...next], { shouldDirty: true });
  };

  const toggleJunction = (id: string, checked: boolean) => {
    const next = new Set(selectedSet);
    if (checked) {
      next.add(id);
    } else {
      next.delete(id);
    }
    setSelected(next);
  };

  const toggleBranch = (junctionIds: string[], selectAll: boolean) => {
    const next = new Set(selectedSet);
    if (selectAll) {
      for (const id of junctionIds) {
        next.add(id);
      }
    } else {
      for (const id of junctionIds) {
        next.delete(id);
      }
    }
    setSelected(next);
  };

  const toggleExpanded = (moduleId: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(moduleId)) {
        next.delete(moduleId);
      } else {
        next.add(moduleId);
      }
      return next;
    });
  };

  if (navLoading) {
    return <p className="text-sm text-muted-foreground">Loading module catalog…</p>;
  }

  if (navTree.length === 0 && enabledTenantModuleIds.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        {useTenantEntitlements
          ? 'No active modules are enabled for this tenant in Configurator.'
          : 'No modules available in the platform catalog.'}
      </p>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-muted-foreground">
          Expand a module to assign Read, Write, and Edit permissions per resource.
        </p>
        <Badge variant="secondary">{selectedSet.size} selected</Badge>
      </div>

      {permissionsLoading ? (
        <p className="text-sm text-muted-foreground">Loading permission links…</p>
      ) : null}

      <div className="max-h-[min(50vh,420px)] space-y-2 overflow-y-auto pr-1">
        {navTree.map((root) => (
          <ModulePermissionBranch
            key={root.module.id}
            node={root}
            expandedIds={expandedIds}
            permissionsByModuleId={permissionsByModuleId}
            selectedSet={selectedSet}
            onToggleExpanded={toggleExpanded}
            onToggleBranch={toggleBranch}
            onToggleJunction={toggleJunction}
          />
        ))}
      </div>
    </div>
  );
}

type ModulePermissionBranchProps = {
  node: NavModuleTreeNode;
  expandedIds: Set<string>;
  permissionsByModuleId: Map<string, NavModulePermissionLink[]>;
  selectedSet: Set<string>;
  onToggleExpanded: (moduleId: string) => void;
  onToggleBranch: (junctionIds: string[], selectAll: boolean) => void;
  onToggleJunction: (id: string, checked: boolean) => void;
  depth?: number;
};

function ModulePermissionBranch({
  node,
  expandedIds,
  permissionsByModuleId,
  selectedSet,
  onToggleExpanded,
  onToggleBranch,
  onToggleJunction,
  depth = 0,
}: ModulePermissionBranchProps) {
  const hasChildren = node.children.length > 0;
  const expanded = expandedIds.has(node.module.id);
  const descendantIds = collectDescendantModuleIds(node);
  const branchJunctionIds = collectJunctionIdsForModules(descendantIds, permissionsByModuleId);
  const branchChecked = getBranchCheckedState(branchJunctionIds, selectedSet);

  if (depth === 0 && hasChildren) {
    return (
      <div className="rounded-md border bg-card">
        <div className="flex items-center gap-2 px-3 py-2.5">
          <button
            type="button"
            className="inline-flex size-6 shrink-0 items-center justify-center rounded-sm border bg-background"
            onClick={() => onToggleExpanded(node.module.id)}
            aria-label={expanded ? 'Collapse module' : 'Expand module'}
          >
            {expanded ? <ChevronDown className="size-3.5" /> : <ChevronRight className="size-3.5" />}
          </button>
          <Checkbox
            checked={branchChecked}
            disabled={branchJunctionIds.length === 0}
            onCheckedChange={() => {
              const allSelected = branchJunctionIds.every((id) => selectedSet.has(id));
              onToggleBranch(branchJunctionIds, !allSelected);
            }}
          />
          <span className="min-w-0 flex-1 text-sm font-semibold">{node.module.name}</span>
          <div className="flex shrink-0 gap-3 text-xs">
            <button
              type="button"
              className="text-primary hover:underline disabled:text-muted-foreground"
              disabled={branchJunctionIds.length === 0}
              onClick={() => onToggleBranch(branchJunctionIds, true)}
            >
              Grant All
            </button>
            <button
              type="button"
              className="text-primary hover:underline disabled:text-muted-foreground"
              disabled={branchJunctionIds.length === 0}
              onClick={() => onToggleBranch(branchJunctionIds, false)}
            >
              Revoke All
            </button>
          </div>
        </div>

        {expanded ? (
          <div className="border-t px-3 pb-2 pt-1">
            {node.children.map((child) => (
              <ModulePermissionBranch
                key={child.module.id}
                node={child}
                depth={depth + 1}
                expandedIds={expandedIds}
                permissionsByModuleId={permissionsByModuleId}
                selectedSet={selectedSet}
                onToggleExpanded={onToggleExpanded}
                onToggleBranch={onToggleBranch}
                onToggleJunction={onToggleJunction}
              />
            ))}
          </div>
        ) : null}
      </div>
    );
  }

  const links = permissionsByModuleId.get(node.module.id) ?? [];
  if (links.length > 0) {
    return (
      <ResourcePermissionRow
        module={node.module}
        links={links}
        selectedSet={selectedSet}
        onToggleJunction={onToggleJunction}
      />
    );
  }

  if (hasChildren) {
    return (
      <div className="space-y-1">
        {node.children.map((child) => (
          <ModulePermissionBranch
            key={child.module.id}
            node={child}
            depth={depth + 1}
            expandedIds={expandedIds}
            permissionsByModuleId={permissionsByModuleId}
            selectedSet={selectedSet}
            onToggleExpanded={onToggleExpanded}
            onToggleBranch={onToggleBranch}
            onToggleJunction={onToggleJunction}
          />
        ))}
      </div>
    );
  }

  return null;
}

function ResourcePermissionRow({
  module,
  links,
  selectedSet,
  onToggleJunction,
}: {
  module: NavModule;
  links: NavModulePermissionLink[];
  selectedSet: Set<string>;
  onToggleJunction: (id: string, checked: boolean) => void;
}) {
  const linksBySlug = useMemo(() => {
    const map = new Map<string, NavModulePermissionLink>();
    for (const link of links) {
      map.set(link.permission_slug, link);
    }
    return map;
  }, [links]);

  const rowJunctionIds = links.map((l) => l.id);
  const rowChecked = getBranchCheckedState(rowJunctionIds, selectedSet);

  return (
    <div className="flex flex-wrap items-center gap-3 border-b py-2 last:border-b-0 sm:flex-nowrap">
      <div className="flex min-w-[140px] flex-1 items-center gap-2">
        <Checkbox
          checked={rowChecked}
          onCheckedChange={() => {
            const allSelected = rowJunctionIds.every((id) => selectedSet.has(id));
            for (const id of rowJunctionIds) {
              onToggleJunction(id, !allSelected);
            }
          }}
        />
        <span className="text-sm font-medium">{module.name}</span>
      </div>
      <div className="flex flex-wrap items-center gap-4 sm:gap-6">
        {PERMISSION_COLUMNS.map((col) => {
          const link = linksBySlug.get(col.slug);
          if (!link) {
            return (
              <label key={col.slug} className="flex items-center gap-1.5 text-sm text-muted-foreground">
                <Checkbox disabled checked={false} />
                <span>{col.label}</span>
              </label>
            );
          }
          return (
            <label
              key={col.slug}
              htmlFor={`mp-${link.id}`}
              className="flex cursor-pointer items-center gap-1.5 text-sm"
            >
              <Checkbox
                id={`mp-${link.id}`}
                checked={selectedSet.has(link.id)}
                onCheckedChange={(c) => onToggleJunction(link.id, c === true)}
              />
              <span>{col.label}</span>
            </label>
          );
        })}
      </div>
    </div>
  );
}
