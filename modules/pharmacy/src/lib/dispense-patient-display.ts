import type { QueueProjectionRow } from "../domain/pharmacy.types.js";

export type DispensePatientSummary = {
  patient_name: string | null;
  uhid: string | null;
  age_years: number | null;
  gender: string | null;
  formatted_visit_id: string | null;
};

export function patientSummaryFromQueueProjection(
  row: QueueProjectionRow | null | undefined,
): DispensePatientSummary {
  if (row == null) {
    return {
      patient_name: null,
      uhid: null,
      age_years: null,
      gender: null,
      formatted_visit_id: null,
    };
  }
  return {
    patient_name: row.patient_name,
    uhid: row.uhid,
    age_years: row.age_years,
    gender: row.gender,
    formatted_visit_id: row.formatted_visit_id ?? null,
  };
}

function patientGenderLabel(gender: string | null | undefined): string {
  if (gender === "male") return "Male";
  if (gender === "female") return "Female";
  if (gender === "other") return "Other";
  return "—";
}

export function formatDispensePatientHeader(
  summary: DispensePatientSummary,
  patientId: string,
): string {
  const name = summary.patient_name?.trim();
  if (!name) {
    return `Patient ${patientId.slice(0, 8)}…`;
  }
  const uhid = summary.uhid?.trim() || "—";
  const age =
    summary.age_years != null && summary.age_years > 0 ? `${summary.age_years}y` : "—";
  const gender = patientGenderLabel(summary.gender);
  return `${name} · ${uhid} · ${age} · ${gender}`;
}

export function formatDispenseVisitLabel(
  visitId: string,
  formattedVisitId: string | null | undefined,
): string {
  const formatted = formattedVisitId?.trim();
  if (formatted) return formatted;
  return visitId.slice(0, 8).toUpperCase();
}
