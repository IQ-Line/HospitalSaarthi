import { getMockDashboardMetrics } from '../mock/dashboard-data.mock';
import type { DashboardMetricsBundle } from '../types';
import { shouldUseDashboardMock } from './facilities';

/**
 * Dashboard metrics for a scoped tenant.
 * Replace with real `/dashboard/*` API calls when the analytics service is available.
 */
export async function fetchDashboardMetrics(
  tenantId: string | null,
): Promise<DashboardMetricsBundle> {
  if (shouldUseDashboardMock()) {
    await new Promise((resolve) => setTimeout(resolve, 120));
    return getMockDashboardMetrics(tenantId);
  }

  // Future: parallel GET /dashboard/stats, footfall, todays-visits, top-items with tenantIdOverride.
  return getMockDashboardMetrics(tenantId);
}
