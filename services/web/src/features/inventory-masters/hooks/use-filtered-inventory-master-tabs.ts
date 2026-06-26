import { resolveNavigationCapabilityBypass } from '@/lib/resolve-nav-bypass';
import { INVENTORY_MASTER_TABS } from '@/features/inventory-masters/inventory-masters-nav-model';
import { principalGrantsInventoryMasterTabAccess } from '@/lib/inventory-masters-route-access';
import { usePermissionsStore } from '@/stores/permissions.store';

/** Horizontal tabs visible for the current principal. */
export function useFilteredInventoryMasterTabs() {
  const capabilityKeys = usePermissionsStore((s) => s.capabilityKeys);
  if (resolveNavigationCapabilityBypass()) {
    return [...INVENTORY_MASTER_TABS];
  }
  return INVENTORY_MASTER_TABS.filter((tab) =>
    principalGrantsInventoryMasterTabAccess(capabilityKeys, tab.id),
  );
}
