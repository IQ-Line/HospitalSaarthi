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
