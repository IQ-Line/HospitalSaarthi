import type { PharmacyDispenseStatus, PharmacyQueueItem } from "../domain/pharmacy.types.js";

export type PharmacyQueueStatusFilter = "all" | "pending" | "partial_issue" | "issued";

export function normalizePharmacyQueueStatus(
  raw: string | null | undefined,
): PharmacyQueueStatusFilter {
  if (raw === "pending" || raw === "partial_issue" || raw === "issued" || raw === "all") {
    return raw;
  }
  return "all";
}

export function normalizePharmacyQueueSearch(raw: string | null | undefined): string {
  return raw?.trim().toLowerCase() ?? "";
}

export function matchesPharmacyQueueSearch(row: PharmacyQueueItem, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;

  const rxToken = row.prescription_id
    ? `rx-${row.prescription_id.replace(/-/g, "").slice(-12)}`
    : "";

  const haystack = [
    row.patient_name,
    row.uhid,
    row.phone,
    row.record_id,
    row.record_id?.slice(0, 8),
    row.visit_id,
    row.visit_id?.slice(0, 8),
    row.prescription_id,
    rxToken,
    row.patient_id,
    row.walk_in_patient_id,
    row.doctor_name,
  ]
    .filter((value): value is string => typeof value === "string" && value.length > 0)
    .join(" ")
    .toLowerCase();

  return haystack.includes(q);
}

export function queueDispenseStatus(row: PharmacyQueueItem): PharmacyDispenseStatus {
  return row.dispense_status;
}

export function matchesPharmacyQueueStatus(
  row: PharmacyQueueItem,
  filter: PharmacyQueueStatusFilter,
): boolean {
  if (filter === "all") return true;
  return queueDispenseStatus(row) === filter;
}

export function pharmacyQueueNeedsFilteredScan(
  search: string,
  status: PharmacyQueueStatusFilter,
): boolean {
  return search.length > 0 || status !== "all";
}
