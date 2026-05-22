import { afterEach, describe, expect, it, vi } from 'vitest';
import { getMockDashboardMetrics } from '../mock/dashboard-data.mock';
import { DashboardDataUnavailableError } from './errors';
import { shouldUseDashboardMock } from './facilities';
import { fetchDashboardMetrics } from './dashboard-metrics';

describe('fetchDashboardMetrics', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('returns mock metrics when mock mode is enabled', async () => {
    vi.stubEnv('VITE_DASHBOARD_USE_MOCK', 'true');
    vi.stubEnv('DEV', 'false');

    const tenantId = '00000000-0000-4000-8000-000000000001';
    const result = await fetchDashboardMetrics(tenantId);

    expect(shouldUseDashboardMock()).toBe(true);
    expect(result).toEqual(getMockDashboardMetrics(tenantId));
  });

  it('does not return mock metrics when VITE_DASHBOARD_USE_MOCK=false', async () => {
    vi.stubEnv('DEV', 'true');
    vi.stubEnv('VITE_DASHBOARD_USE_MOCK', 'false');

    expect(shouldUseDashboardMock()).toBe(false);

    await expect(fetchDashboardMetrics('00000000-0000-4000-8000-000000000001')).rejects.toBeInstanceOf(
      DashboardDataUnavailableError,
    );
  });
});
