import { apiClientWithIqTenant } from '@/lib/api-client';
import { DashboardDataUnavailableError } from './errors';
import type { DashboardMetricsBundle } from '../types';

export const DASHBOARD_STATS_DAYS = 3;
const STATS_PATH = `/api/registration/v1/dashboard/stats?days=${DASHBOARD_STATS_DAYS}`;

type StatsApiResponse = {
  stats: {
    total_visits: number;
    new_patient_registrations: number;
    follow_up_patient_registrations: number;
    doctor_pending_consultations: number;
  };
  patient_footfall: { date: string; count: number }[];
  todays_visits: {
    registration_id: string;
    patient_name: string;
    time: string;
    status: 'completed' | 'pending' | 'in_progress';
  }[];
};

export async function fetchDashboardMetrics(tenantId: string): Promise<DashboardMetricsBundle> {
  if (!tenantId.trim()) {
    throw new DashboardDataUnavailableError('Tenant is required for dashboard metrics.');
  }

  try {
    const body = await apiClientWithIqTenant<StatsApiResponse>(tenantId, STATS_PATH);
    return {
      stats: {
        totalVisits: body.stats.total_visits,
        newPatientRegistrations: body.stats.new_patient_registrations,
        followUpPatientRegistrations: body.stats.follow_up_patient_registrations,
        doctorPendingConsultations: body.stats.doctor_pending_consultations,
      },
      footfall: body.patient_footfall,
      todaysVisits: body.todays_visits.map((v) => ({
        id: v.registration_id,
        patientName: v.patient_name,
        time: v.time,
        status: v.status,
      })),
      topItems: { medicines: [], diagnoses: [], diagnostics: [] },
    };
  } catch (error) {
    throw new DashboardDataUnavailableError('Failed to load dashboard metrics from Registration.', {
      cause: error,
    });
  }
}
