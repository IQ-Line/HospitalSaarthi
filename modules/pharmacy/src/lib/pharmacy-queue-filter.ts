import type { PharmacyQueueItem } from "../domain/pharmacy.types.js";

export type PharmacyQueueStatusFilter = "all" | "pending" | "issued";

export function normalizePharmacyQueueStatus(
  raw: string | null | undefined,
): PharmacyQueueStatusFilter {
  if (raw === "pending" || raw === "issued" || raw === "all") {
    return raw;
  }
  return "all";
}

export function normalizePharmacyQueueSearch(raw: string | null | undefined): string {
  return raw?.trim() ?? "";
}

function formatRxNumberSearchToken(prescriptionId: string | null): string {
  if (!prescriptionId) return "";
  const compact = prescriptionId.replace(/-/g, "");
  return `rx-${compact.slice(-12)}`;
}

export function matchesPharmacyQueueSearch(row: PharmacyQueueItem, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;

  const haystack = [
    row.patient_name,
    row.uhid,
    row.phone,
    row.record_id,
    row.record_id?.slice(0, 8),
    row.visit_id,
    row.visit_id?.slice(0, 8),
    row.prescription_id,
    formatRxNumberSearchToken(row.prescription_id),
    row.patient_id,
    row.walk_in_patient_id,
    row.doctor_name,
  ]
    .filter((value): value is string => typeof value === "string" && value.length > 0)
    .join(" ")
    .toLowerCase();

  return haystack.includes(q);
}

export function matchesPharmacyQueueStatus(
  row: PharmacyQueueItem,
  filter: PharmacyQueueStatusFilter,
): boolean {
  if (filter === "all") return true;
  if (filter === "pending") return !row.has_dispense;
  return row.has_dispense;
}

export function pharmacyQueueNeedsFilteredScan(
  search: string,
  status: PharmacyQueueStatusFilter,
): boolean {
  return search.length > 0 || status !== "all";
}
