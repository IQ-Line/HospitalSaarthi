import type {
  DashboardStatsResponse,
  DashboardTodaysVisit,
} from "../domain/dashboard.types.js";
import type { VisitRepo } from "../ports.js";

const DEFAULT_DAYS = 3;
const TZ = "Asia/Kolkata";

function clampDays(days?: number): number {
  const n = days ?? DEFAULT_DAYS;
  return Math.min(30, Math.max(3, Number.isFinite(n) ? n : DEFAULT_DAYS));
}

function fillFootfall(
  rows: { date: string; count: number }[],
  days: number,
): { date: string; count: number }[] {
  const byDate = new Map(rows.map((r) => [r.date, r.count]));
  return Array.from({ length: days }, (_, i) => {
    const key = new Date(Date.now() - (days - 1 - i) * 86_400_000).toLocaleDateString("en-CA", {
      timeZone: TZ,
    });
    return { date: key, count: byDate.get(key) ?? 0 };
  });
}

function formatIstTime(at: Date): string {
  return at.toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: TZ,
  });
}

function mapVisitStatus(status: string): DashboardTodaysVisit["status"] {
  if (status === "completed") return "completed";
  if (status === "in_progress") return "in_progress";
  return "pending";
}

export async function getDashboardMetrics(
  deps: { visitRepo: VisitRepo },
  tenantId: string,
  options?: { days?: number },
): Promise<DashboardStatsResponse> {
  const days = clampDays(options?.days);
  const raw = await deps.visitRepo.getDashboardMetrics(tenantId, days);

  return {
    stats: {
      total_visits: raw.total,
      new_patient_registrations: raw.new_patients,
      follow_up_patient_registrations: raw.follow_ups,
      doctor_pending_consultations: 0,
    },
    patient_footfall: fillFootfall(raw.footfall, days),
    todays_visits: raw.todays_visits.map((row) => ({
      visit_id: row.visit_id,
      registration_id: row.registration_id,
      patient_name: row.patient_name,
      time: formatIstTime(row.created_at),
      status: mapVisitStatus(row.visit_status),
    })),
  };
}
