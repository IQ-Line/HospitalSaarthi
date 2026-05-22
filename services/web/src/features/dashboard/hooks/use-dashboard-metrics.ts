import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { fetchDashboardMetrics } from '../api/dashboard-metrics';
import { dashboardKeys } from '../api/query-keys';

export function useDashboardMetrics(tenantId: string | null) {
  return useQuery({
    queryKey: dashboardKeys.metrics(tenantId),
    queryFn: () => fetchDashboardMetrics(tenantId),
    enabled: tenantId != null && tenantId.length > 0,
    placeholderData: keepPreviousData,
    staleTime: 30_000,
    refetchInterval: 60_000,
  });
}
