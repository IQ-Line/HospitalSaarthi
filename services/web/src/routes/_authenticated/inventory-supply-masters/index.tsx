import { createFileRoute, redirect } from '@tanstack/react-router';
import {
  assertInventorySupplyMastersTenantAdmin,
  defaultInventoryMasterLandingPath,
  firstAccessibleInventoryMasterPath,
} from '@/features/inventory-masters/lib/inventory-masters-access';
import { usePermissionsStore } from '@/stores/permissions.store';

export const Route = createFileRoute('/_authenticated/inventory-supply-masters/')({
  beforeLoad: () => {
    assertInventorySupplyMastersTenantAdmin();
    const capabilityKeys = usePermissionsStore.getState().capabilityKeys;
    const target = firstAccessibleInventoryMasterPath(capabilityKeys) ?? defaultInventoryMasterLandingPath();
    throw redirect({ to: target });
  },
});
