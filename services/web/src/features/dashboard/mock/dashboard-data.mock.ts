import type { DashboardMetricsBundle } from '../types';
import { MOCK_DASHBOARD_FACILITIES } from './facilities.mock';

const DEFAULT_BUNDLE: DashboardMetricsBundle = {
  stats: {
    totalVisits: 0,
    newPatientRegistrations: 0,
    followUpPatientRegistrations: 0,
    doctorPendingConsultations: 0,
  },
  footfall: [
    { date: '2026-05-19', count: 9 },
    { date: '2026-05-20', count: 9 },
    { date: '2026-05-21', count: 3 },
  ],
  todaysVisits: [],
  topItems: {
    medicines: [],
    diagnoses: [
      { name: 'Ebola', count: 2 },
      { name: 'epilepsy', count: 1 },
      { name: 'Underweight', count: 1 },
      { name: 'seizure', count: 1 },
      { name: 'Influenza', count: 1 },
    ],
    diagnostics: [],
  },
};

const FACILITY_BUNDLES: Record<string, DashboardMetricsBundle> = {
  '00000000-0000-4000-8000-000000000001': DEFAULT_BUNDLE,
  '00000000-0000-4000-8000-000000000002': {
    stats: {
      totalVisits: 42,
      newPatientRegistrations: 18,
      followUpPatientRegistrations: 24,
      doctorPendingConsultations: 5,
    },
    footfall: [
      { date: '2026-05-19', count: 14 },
      { date: '2026-05-20', count: 11 },
      { date: '2026-05-21', count: 17 },
    ],
    todaysVisits: [
      {
        id: 'v1',
        patientName: 'Ramesh Kumar',
        time: '09:15',
        status: 'completed',
      },
      {
        id: 'v2',
        patientName: 'Sunita Devi',
        time: '10:30',
        status: 'pending',
      },
    ],
    topItems: {
      medicines: [
        { name: 'Paracetamol 500mg', count: 12 },
        { name: 'Amoxicillin 250mg', count: 8 },
      ],
      diagnoses: [
        { name: 'Hypertension', count: 6 },
        { name: 'Diabetes Type 2', count: 4 },
      ],
      diagnostics: [{ name: 'CBC', count: 7 }],
    },
  },
  '00000000-0000-4000-8000-000000000003': {
    stats: {
      totalVisits: 128,
      newPatientRegistrations: 45,
      followUpPatientRegistrations: 83,
      doctorPendingConsultations: 12,
    },
    footfall: [
      { date: '2026-05-19', count: 38 },
      { date: '2026-05-20', count: 41 },
      { date: '2026-05-21', count: 49 },
    ],
    todaysVisits: [
      {
        id: 'v3',
        patientName: 'Amit Sharma',
        time: '08:00',
        status: 'completed',
      },
      {
        id: 'v4',
        patientName: 'Priya Singh',
        time: '11:45',
        status: 'in_progress',
      },
      {
        id: 'v5',
        patientName: 'Vikram Patel',
        time: '14:20',
        status: 'pending',
      },
    ],
    topItems: {
      medicines: [{ name: 'Metformin 500mg', count: 22 }],
      diagnoses: [{ name: 'Acute gastroenteritis', count: 9 }],
      diagnostics: [
        { name: 'Chest X-Ray', count: 5 },
        { name: 'Lipid profile', count: 3 },
      ],
    },
  },
};

export function getMockDashboardMetrics(tenantId: string | null | undefined): DashboardMetricsBundle {
  if (!tenantId) {
    return DEFAULT_BUNDLE;
  }
  return FACILITY_BUNDLES[tenantId] ?? DEFAULT_BUNDLE;
}

export function listMockFacilityTenantIds(): string[] {
  return MOCK_DASHBOARD_FACILITIES.map((f) => f.tenantId);
}
