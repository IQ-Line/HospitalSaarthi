import type { OpdCompletedVisitSummary } from "../domain/pharmacy.types.js";

/** Completed OPD visit with a final prescription and at least one medicine line. */
export function isEligibleOpdQueueProjectionRow(row: OpdCompletedVisitSummary): boolean {
  return (
    row.prescription_id != null &&
    row.prescription_id.trim().length > 0 &&
    row.prescription_status === "final" &&
    row.visit_status === "completed" &&
    row.medicine_count > 0
  );
}

export function resolveOpdQueueQueuedAt(row: OpdCompletedVisitSummary): Date {
  if (row.finalized_at?.trim()) {
    const parsed = new Date(row.finalized_at);
    if (!Number.isNaN(parsed.getTime())) {
      return parsed;
    }
  }
  const updated = new Date(row.updated_at);
  return Number.isNaN(updated.getTime()) ? new Date() : updated;
}
