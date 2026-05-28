export interface DashboardStats {
  total_visits: number;
  new_patient_registrations: number;
  follow_up_patient_registrations: number;
  doctor_pending_consultations: number;
}

export interface DashboardFootfallPoint {
  date: string;
  count: number;
}

export interface DashboardTodaysVisit {
  registration_id: string;
  patient_name: string;
  time: string;
  status: "completed" | "pending" | "in_progress";
}

export interface DashboardStatsResponse {
  stats: DashboardStats;
  patient_footfall: DashboardFootfallPoint[];
  todays_visits: DashboardTodaysVisit[];
}

/** Raw aggregates from the repository before footfall gap-fill. */
export interface DashboardRepoMetrics {
  total: number;
  new_patients: number;
  follow_ups: number;
  footfall: DashboardFootfallPoint[];
  todays_visits: DashboardTodaysVisit[];
}
