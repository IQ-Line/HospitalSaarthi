import { resolveTenantAdmin } from '@/lib/platform-admin';
import { INVENTORY_MASTER_TABS } from '@/features/inventory-masters/inventory-masters-nav-model';
import { principalGrantsInventoryMasterTabAccess } from '@/lib/inventory-masters-route-access';
import { useAuthStore } from '@/stores/auth.store';
import { usePermissionsStore } from '@/stores/permissions.store';

/** Horizontal tabs visible for tenant administrators with catalog access. */
export function useFilteredInventoryMasterTabs() {
  const capabilityKeys = usePermissionsStore((s) => s.capabilityKeys);
  const authRoles = useAuthStore((s) => s.roles);
  const principalRoles = usePermissionsStore((s) => s.roles);
  const accessToken = useAuthStore((s) => s.accessToken);
  const isTenantAdmin = resolveTenantAdmin({ principalRoles, authRoles, accessToken });

  if (!isTenantAdmin) {
    return [];
  }

  const accessible = INVENTORY_MASTER_TABS.filter((tab) =>
    principalGrantsInventoryMasterTabAccess(capabilityKeys, tab.id),
  );
  return accessible.length > 0 ? accessible : [...INVENTORY_MASTER_TABS];
}
