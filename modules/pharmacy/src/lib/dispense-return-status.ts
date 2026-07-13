import type { DispenseLineItemRecord } from "../domain/pharmacy.types.js";

const RETURN_ELIGIBLE_DISPENSE_STATUSES = new Set([
  "issued",
  "partial_issue",
  "partially_returned",
]);

export function isDispenseEligibleForReturn(dispenseStatus: string): boolean {
  return RETURN_ELIGIBLE_DISPENSE_STATUSES.has(dispenseStatus);
}

/** After applying return quantities, derive dispense header status. */
export function computeDispenseStatusAfterReturn(
  lines: Array<Pick<DispenseLineItemRecord, "quantity_dispensed" | "quantity_returned">>,
  previousStatus: string,
): string {
  const activeLines = lines.filter((line) => Number(line.quantity_dispensed) > 0);
  if (activeLines.length === 0) {
    return previousStatus;
  }

  const anyReturned = activeLines.some((line) => Number(line.quantity_returned) > 0);
  if (!anyReturned) {
    return previousStatus;
  }

  const allFullyReturned = activeLines.every(
    (line) => Number(line.quantity_returned) >= Number(line.quantity_dispensed),
  );
  return allFullyReturned ? "fully_returned" : "partially_returned";
}
