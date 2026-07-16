import { isInventorySupplyMastersTenantAdminPrincipal } from '@/features/inventory-masters/lib/inventory-masters-access';
import { INVENTORY_MASTER_TABS } from '@/features/inventory-masters/inventory-masters-nav-model';
import { principalGrantsInventoryMasterTabAccess } from '@/lib/inventory-masters-route-access';
import { usePermissionsStore } from '@/stores/permissions.store';
import { useTenantStore } from '@/stores/tenant.store';

/** Horizontal tabs — full set for inventory admins; L3-filtered for delegated staff. */
export function useFilteredInventoryMasterTabs() {
  const capabilityKeys = usePermissionsStore((s) => s.capabilityKeys);
  // Re-render when active facility changes (superadmin post-Onboarding selection).
  useTenantStore((s) => s.tenantId);
  useTenantStore((s) => s.homeTenantId);

  if (isInventorySupplyMastersTenantAdminPrincipal()) {
    return [...INVENTORY_MASTER_TABS];
  }

  return INVENTORY_MASTER_TABS.filter((tab) =>
    principalGrantsInventoryMasterTabAccess(capabilityKeys, tab.id),
  );
}
