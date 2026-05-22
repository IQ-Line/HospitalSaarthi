import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { fetchDashboardMetrics } from '../api/dashboard-metrics';
import { shouldUseDashboardMock } from '../api/facilities';
import { dashboardKeys } from '../api/query-keys';

export function useDashboardMetrics(tenantId: string | null) {
  const useMock = shouldUseDashboardMock();

  return useQuery({
    queryKey: dashboardKeys.metrics(tenantId),
    queryFn: () => fetchDashboardMetrics(tenantId),
    enabled: tenantId != null && tenantId.length > 0,
    placeholderData: keepPreviousData,
    staleTime: 30_000,
    refetchInterval: useMock ? 60_000 : false,
    retry: useMock ? undefined : false,
  });
}
