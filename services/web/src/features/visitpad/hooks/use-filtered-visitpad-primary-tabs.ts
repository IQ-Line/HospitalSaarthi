import {
  filterVisitpadPrimaryTabGroups,
  visitpadPrimaryTabGroups,
} from '@/features/visitpad/lib/visitpad-access';
import { resolveNavigationCapabilityBypass } from '@/lib/resolve-nav-bypass';
import { usePermissionsStore } from '@/stores/permissions.store';

/** Visitpad horizontal tabs visible for the current principal (manifest + catalog route access). */
export function useFilteredVisitpadPrimaryTabs() {
  const capabilityKeys = usePermissionsStore((s) => s.capabilityKeys);
  if (resolveNavigationCapabilityBypass()) {
    return [...visitpadPrimaryTabGroups];
  }
  return filterVisitpadPrimaryTabGroups(capabilityKeys);
}
