import { useMemo } from 'react';
import { collectModuleDiscoveryEntries } from './filter-navigation-tree';
import { useFilteredNavigation } from './use-filtered-navigation';

/** Routable entries from the filtered manifest (dashboard module discovery). */
export function useNavigationDiscovery() {
  const filtered = useFilteredNavigation();

  return useMemo(() => collectModuleDiscoveryEntries(filtered), [filtered]);
}
