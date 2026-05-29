import { afterEach, describe, expect, it, vi } from 'vitest';
import { DashboardDataUnavailableError } from './errors';

const apiClientWithIqTenantMock = vi.fn();

vi.mock('@/lib/api-client', () => ({
  apiClientWithIqTenant: (...args: unknown[]) => apiClientWithIqTenantMock(...args),
}));

import { fetchDashboardMetrics } from './dashboard-metrics';

const tenantId = '00000000-0000-4000-8000-000000000001';

describe('fetchDashboardMetrics', () => {
  afterEach(() => {
    apiClientWithIqTenantMock.mockReset();
  });

  it('loads stats for the given tenant', async () => {
    apiClientWithIqTenantMock.mockResolvedValue({
      stats: {
        total_visits: 10,
        new_patient_registrations: 4,
        follow_up_patient_registrations: 6,
        doctor_pending_consultations: 0,
      },
      patient_footfall: [{ date: '2026-05-28', count: 5 }],
      todays_visits: [
        {
          registration_id: '11111111-1111-4111-8111-111111111111',
          patient_name: 'Test Patient',
          time: '09:30',
          status: 'pending',
        },
      ],
    });

    const result = await fetchDashboardMetrics(tenantId);

    expect(apiClientWithIqTenantMock).toHaveBeenCalledWith(
      tenantId,
      '/api/registration/v1/dashboard/stats',
    );
    expect(result.stats.doctorPendingConsultations).toBe(0);
    expect(result.stats.totalVisits).toBe(10);
    expect(result.todaysVisits[0]?.patientName).toBe('Test Patient');
  });

  it('throws when tenant id is empty', async () => {
    await expect(fetchDashboardMetrics('')).rejects.toBeInstanceOf(DashboardDataUnavailableError);
  });
});
