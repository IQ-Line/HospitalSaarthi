import { DashboardDataUnavailableError } from './errors';
import { shouldUseDashboardMock } from './facilities';
import { getMockDashboardMetrics } from '../mock/dashboard-data.mock';
import type { DashboardMetricsBundle } from '../types';

const LIVE_METRICS_MESSAGE =
  'Dashboard analytics API is not available. Set VITE_DASHBOARD_USE_MOCK=true for development, or wire /dashboard/* endpoints before disabling mock mode.';

/**
 * Dashboard metrics for a scoped tenant.
 * Live mode throws until `/dashboard/*` API calls are implemented.
 */
export async function fetchDashboardMetrics(
  tenantId: string | null,
): Promise<DashboardMetricsBundle> {
  if (shouldUseDashboardMock()) {
    await new Promise((resolve) => setTimeout(resolve, 120));
    return getMockDashboardMetrics(tenantId);
  }

  throw new DashboardDataUnavailableError(LIVE_METRICS_MESSAGE);
}
