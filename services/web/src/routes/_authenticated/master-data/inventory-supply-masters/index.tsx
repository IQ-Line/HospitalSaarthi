import { createFileRoute, redirect } from '@tanstack/react-router';
import {
  defaultInventoryMasterLandingPath,
  firstAccessibleInventoryMasterPath,
} from '@/features/inventory-masters/lib/inventory-masters-access';
import { resolveNavigationCapabilityBypass } from '@/lib/resolve-nav-bypass';
import { usePermissionsStore } from '@/stores/permissions.store';

export const Route = createFileRoute('/_authenticated/master-data/inventory-supply-masters/')({
  beforeLoad: () => {
    if (resolveNavigationCapabilityBypass()) {
      throw redirect({ to: defaultInventoryMasterLandingPath() });
    }
    const capabilityKeys = usePermissionsStore.getState().capabilityKeys;
    const target = firstAccessibleInventoryMasterPath(capabilityKeys) ?? '/dashboard';
    throw redirect({ to: target });
  },
});
