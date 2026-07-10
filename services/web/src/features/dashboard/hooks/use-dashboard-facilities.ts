import { useQuery } from '@tanstack/react-query';
import { fetchDashboardFacilities } from '../api/facilities';
import { dashboardKeys } from '../api/query-keys';

export function useDashboardFacilities(enabled = true) {
  return useQuery({
    queryKey: dashboardKeys.facilities(),
    queryFn: fetchDashboardFacilities,
    enabled,
    staleTime: 60_000,
  });
}
