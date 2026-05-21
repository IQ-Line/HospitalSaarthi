import { filterVisitpadPrimaryTabGroups } from '@/features/visitpad/lib/visitpad-access';
import { usePermissionsStore } from '@/stores/permissions.store';

/** Visitpad horizontal tabs visible for the current principal (manifest + catalog route access). */
export function useFilteredVisitpadPrimaryTabs() {
  const capabilityKeys = usePermissionsStore((s) => s.capabilityKeys);
  return filterVisitpadPrimaryTabGroups(capabilityKeys);
}
