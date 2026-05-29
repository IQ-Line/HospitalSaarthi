import { useQuery } from '@tanstack/react-query';
import { fetchDashboardMetrics } from '../api/dashboard-metrics';
import { dashboardKeys } from '../api/query-keys';

const DEFAULT_STALE_TIME_MS = 30_000;
/** Sidebar mounts on every frontdesk page — avoid refetch churn while navigating. */
const SIDEBAR_STALE_TIME_MS = 5 * 60_000;

export type UseDashboardMetricsOptions = {
  staleTime?: number;
};

export function useDashboardMetrics(
  tenantId: string | null,
  options?: UseDashboardMetricsOptions,
) {
  return useQuery({
    queryKey: dashboardKeys.metrics(tenantId),
    queryFn: () => fetchDashboardMetrics(tenantId!),
    enabled: Boolean(tenantId?.trim()),
    staleTime: options?.staleTime ?? DEFAULT_STALE_TIME_MS,
    retry: false,
  });
}

export function useDashboardMetricsSidebar(tenantId: string | null) {
  return useDashboardMetrics(tenantId, { staleTime: SIDEBAR_STALE_TIME_MS });
}
