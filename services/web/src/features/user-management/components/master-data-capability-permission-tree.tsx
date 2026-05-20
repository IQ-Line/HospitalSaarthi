import { useMemo } from 'react';
import { useModules } from '@/features/master-data/api';
import { filterRootModulesForEnabledSelection } from '@/features/configurator/components/create-tenant-wizard/wizard-module-tree';
import { WizardPermissionModuleTree } from '@/features/configurator/components/create-tenant-wizard/wizard-permission-module-tree';
import { buildMasterDataPermissionTreeContext } from '../lib/role-capability-md-tree';
import type { Capability } from '../types';

export type MasterDataCapabilityPermissionTreeProps = {
  capabilities: Capability[];
  selectedCapabilityIds: string[];
  onSelectedCapabilityIdsChange: (ids: string[]) => void;
  editable?: boolean;
};

/**
 * Product (L1) → feature (L2) → permissions (L3); deeper catalog rows roll up under L3.
 * Same layout as the create-tenant wizard step 3 permission tree.
 */
export function MasterDataCapabilityPermissionTree({
  capabilities,
  selectedCapabilityIds,
  onSelectedCapabilityIdsChange,
  editable = true,
}: MasterDataCapabilityPermissionTreeProps) {
  const modulesQuery = useModules(undefined, { globalCatalog: true });
  const modules = useMemo(
    () => (modulesQuery.data?.data ?? []).filter((module) => module.is_active && !module.is_deleted),
    [modulesQuery.data?.data],
  );

  const tree = useMemo(
    () => buildMasterDataPermissionTreeContext(modules, capabilities),
    [modules, capabilities],
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

  const selectedSet = useMemo(() => new Set(selectedCapabilityIds), [selectedCapabilityIds]);

  if (modulesQuery.isPending) {
    return <p className="text-sm text-muted-foreground">Loading module catalog…</p>;
  }

  if (modulesQuery.isError) {
    return <p className="text-sm text-destructive">Could not load the module catalog.</p>;
  }

  if (capabilities.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">This role has no permissions set up yet.</p>
    );
  }

  if (filteredRoots.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        No catalog modules match these permissions. Run migrations and sync capabilities.
      </p>
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
    <WizardPermissionModuleTree
      roots={filteredRoots}
      childMap={tree.childMap}
      enabledModuleIds={tree.enabledModuleIds}
      optionsByModuleId={tree.optionsByModuleId}
      selectedCapabilityIds={selectedSet}
      onToggleCapability={toggleCapability}
      onToggleModuleCapabilities={toggleModuleCapabilities}
    />
  );
}
