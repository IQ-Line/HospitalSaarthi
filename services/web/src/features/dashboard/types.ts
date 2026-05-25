/** Facility / tenant option for the super-admin dashboard switcher. */
export interface DashboardFacility {
  tenantId: string;
  facilityId: string;
  name: string;
}

export interface DashboardStats {
  totalVisits: number;
  newPatientRegistrations: number;
  followUpPatientRegistrations: number;
  doctorPendingConsultations: number;
}

export interface FootfallPoint {
  date: string;
  count: number;
}

export interface TodaysVisitRow {
  id: string;
  patientName: string;
  time: string;
  status: 'completed' | 'pending' | 'in_progress';
}

export interface TopItemRow {
  name: string;
  count: number;
}

export interface DashboardTopItems {
  medicines: TopItemRow[];
  diagnoses: TopItemRow[];
  diagnostics: TopItemRow[];
}

export interface DashboardMetricsBundle {
  stats: DashboardStats;
  footfall: FootfallPoint[];
  todaysVisits: TodaysVisitRow[];
  topItems: DashboardTopItems;
}
