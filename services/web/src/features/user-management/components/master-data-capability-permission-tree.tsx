import { useDeferredValue, useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { globalModulesCatalogQueryOptions } from '@/features/master-data/api';
import { filterRootModulesForEnabledSelection } from '@/features/configurator/components/create-tenant-wizard/wizard-module-tree';
import { WizardPermissionModuleTree } from '@/features/configurator/components/create-tenant-wizard/wizard-permission-module-tree';
import { resolvePlatformSuperAdmin } from '@/lib/platform-admin';
import { useAuthStore } from '@/stores/auth.store';
import { usePermissionsStore } from '@/stores/permissions.store';
import { buildMasterDataPermissionTreeContext, resolveCapabilityCatalogModuleSlug } from '../lib/role-capability-md-tree';
import type { Capability } from '../types';
import {
  buildCapabilityTree,
  CapabilityTreeNodeRow,
  treeBranchIds,
} from './role-management-sections';

const PLATFORM_MODULE_SLUGS: ReadonlySet<string> = new Set([
  'user-management',
  'configurator',
  'master-data',
]);

export type MasterDataCapabilityPermissionTreeProps = {
  capabilities: Capability[];
  selectedCapabilityIds: string[];
  onSelectedCapabilityIdsChange: (ids: string[]) => void;
  editable?: boolean;
  /** When true, always exclude platform modules regardless of admin status. */
  productOnly?: boolean;
};

/**
 * Product (L1) → feature (L2) → permissions (L3); deeper catalog rows roll up under L3.
 * Same layout as the create-tenant wizard step 3 permission tree.
 * Falls back to a runtime-key tree when catalog slugs cannot be resolved.
 */
export function MasterDataCapabilityPermissionTree({
  capabilities,
  selectedCapabilityIds,
  onSelectedCapabilityIdsChange,
  editable = true,
  productOnly = false,
}: MasterDataCapabilityPermissionTreeProps) {
  const principalRoles = usePermissionsStore((s) => s.roles);
  const authRoles = useAuthStore((s) => s.roles);
  const accessToken = useAuthStore((s) => s.accessToken);
  const isSuperAdmin = resolvePlatformSuperAdmin({ principalRoles, authRoles, accessToken });

  const modulesQuery = useQuery(globalModulesCatalogQueryOptions());
  const deferredSelectedIds = useDeferredValue(selectedCapabilityIds);
  const selectionPending = deferredSelectedIds !== selectedCapabilityIds;

  const allModules = useMemo(
    () => (modulesQuery.data?.data ?? []).filter((module) => module.is_active && !module.is_deleted),
    [modulesQuery.data?.data],
  );

  const modules = useMemo(
    () => productOnly
      ? allModules.filter((m) => m.module_kind === 'product')
      : isSuperAdmin
        ? allModules
        : allModules.filter((m) => m.module_kind !== 'platform'),
    [isSuperAdmin, productOnly, allModules],
  );

  const visibleCapabilities = useMemo(() => {
    if (isSuperAdmin && !productOnly) return capabilities;
    return capabilities.filter((cap) => {
      const slug = resolveCapabilityCatalogModuleSlug(cap, allModules);
      return slug === null || !PLATFORM_MODULE_SLUGS.has(slug);
    });
  }, [isSuperAdmin, productOnly, capabilities, allModules]);

  const tree = useMemo(
    () => buildMasterDataPermissionTreeContext(modules, visibleCapabilities),
    [modules, visibleCapabilities],
  );

  const filteredRoots = useMemo(
    () =>
      filterRootModulesForEnabledSelection(
        tree.rootModules,
        tree.childMap,
        tree.enabledModuleIds,
      ),
    [tree.rootModules, tree.childMap, tree.enabledModuleIds],
  );

  const selectedSet = useMemo(() => new Set(deferredSelectedIds), [deferredSelectedIds]);
  const useCatalogTree = filteredRoots.length > 0;

  const [expandedBranchIds, setExpandedBranchIds] = useState<Set<string>>(new Set());
  const capabilityTree = useMemo(() => buildCapabilityTree(visibleCapabilities), [visibleCapabilities]);

  useEffect(() => {
    if (useCatalogTree) return;
    const branchIds = treeBranchIds(capabilityTree);
    setExpandedBranchIds((current) => {
      const next = new Set(current);
      branchIds.forEach((branchId) => {
        if (branchId.replace(/^branch:/, '').split('/').filter(Boolean).length <= 1) {
          next.add(branchId);
        }
      });
      return next;
    });
  }, [useCatalogTree, capabilityTree]);

  if (modulesQuery.isPending) {
    return <p className="text-sm text-muted-foreground">Loading module catalog…</p>;
  }

  if (modulesQuery.isError) {
    return <p className="text-sm text-destructive">Could not load the module catalog.</p>;
  }

  if (visibleCapabilities.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">This role has no permissions set up yet.</p>
    );
  }

  if (!useCatalogTree) {
    return (
      <div className="space-y-3">
        <p className="text-xs text-muted-foreground">
          Showing permissions by product module (catalog tree unavailable for some rows).
        </p>
        <div className="space-y-4">
          {capabilityTree.map((node) => (
            <CapabilityTreeNodeRow
              key={node.id}
              node={node}
              depth={0}
              capabilitiesEditable={editable}
              selectedCapabilityIds={selectedSet}
              expandedBranchIds={expandedBranchIds}
              forceExpanded={false}
              onBranchToggle={(nodeId) => {
                setExpandedBranchIds((current) => {
                  const next = new Set(current);
                  if (next.has(nodeId)) {
                    next.delete(nodeId);
                  } else {
                    next.add(nodeId);
                  }
                  return next;
                });
              }}
              onSetSelectedCapabilityIds={onSelectedCapabilityIdsChange}
              onToggleCapability={(capabilityId) => {
                const next = selectedCapabilityIds.includes(capabilityId)
                  ? selectedCapabilityIds.filter((id) => id !== capabilityId)
                  : [...selectedCapabilityIds, capabilityId];
                onSelectedCapabilityIdsChange(next);
              }}
              plainLanguage
            />
          ))}
        </div>
      </div>
    );
  }

  const toggleCapability = (capabilityId: string) => {
    if (!editable) return;
    const next = selectedCapabilityIds.includes(capabilityId)
      ? selectedCapabilityIds.filter((id) => id !== capabilityId)
      : [...selectedCapabilityIds, capabilityId];
    onSelectedCapabilityIdsChange(next);
  };

  const toggleModuleCapabilities = (capabilityIds: string[], selected: boolean) => {
    if (!editable) return;
    const idSet = new Set(selectedCapabilityIds);
    for (const id of capabilityIds) {
      if (selected) {
        idSet.add(id);
      } else {
        idSet.delete(id);
      }
    }
    onSelectedCapabilityIdsChange([...idSet]);
  };

  return (
    <div
      className={selectionPending ? 'pointer-events-none opacity-70' : undefined}
      aria-busy={selectionPending}
    >
      <WizardPermissionModuleTree
        roots={filteredRoots}
        childMap={tree.childMap}
        enabledModuleIds={tree.enabledModuleIds}
        optionsByModuleId={tree.optionsByModuleId}
        selectedCapabilityIds={selectedSet}
        onToggleCapability={toggleCapability}
        onToggleModuleCapabilities={toggleModuleCapabilities}
        moduleCheckboxes={editable}
        defaultExpandedModuleIds={[]}
      />
    </div>
  );
}
