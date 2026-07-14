import type {
  DispenseFulfillmentStatus,
  OpdPrescriptionMedicineLine,
  PharmacyDispenseStatus,
  SaveDispenseLineInput,
} from "../domain/pharmacy.types.js";

export type { DispenseFulfillmentStatus, PharmacyDispenseStatus };

function parseQty(raw: string | null | undefined): number | null {
  if (raw == null || String(raw).trim() === "") return null;
  const value = Number(raw);
  return Number.isFinite(value) ? value : null;
}

function isQuantityShort(dispensed: number, expected: number | null): boolean {
  if (expected == null) return false;
  return dispensed + 1e-9 < expected;
}

function isLineQuantityShort(
  prescribedQuantity: string | null | undefined,
  quantityDispensed: string,
): boolean {
  const expected = parseQty(prescribedQuantity);
  const dispensed = parseQty(quantityDispensed);
  if (expected == null || dispensed == null) return false;
  return isQuantityShort(dispensed, expected);
}

/** True when any line's dispensed qty is below its prescribed qty. */
function hasShortPrescribedQuantity(
  dispenseLines: readonly SaveDispenseLineInput[],
): boolean {
  return dispenseLines.some((line) =>
    isLineQuantityShort(line.prescribed_quantity, line.quantity_dispensed),
  );
}

/**
 * OPD visit dispense fulfillment — qty only.
 * Partial when any line's dispensed qty is below its prescribed qty.
 * Medicine IDs are ignored (issued item may be a substitute).
 */
export function computeOpdDispenseFulfillmentStatus(
  _dispensableMedicines: readonly OpdPrescriptionMedicineLine[],
  dispenseLines: readonly SaveDispenseLineInput[],
  _prescriptionMedicineCount = 0,
): DispenseFulfillmentStatus {
  if (hasShortPrescribedQuantity(dispenseLines)) {
    return "partial_issue";
  }
  return "issued";
}

/** Walk-in dispense: partial only when a line qty is below its prescribed qty. */
export function computeWalkInDispenseFulfillmentStatus(
  dispenseLines: readonly SaveDispenseLineInput[],
): DispenseFulfillmentStatus {
  if (hasShortPrescribedQuantity(dispenseLines)) {
    return "partial_issue";
  }
  return "issued";
}

export function pharmacyDispenseStatusFromRecord(
  record: { dispense_status: DispenseFulfillmentStatus } | null | undefined,
): PharmacyDispenseStatus {
  return record?.dispense_status ?? "pending";
}

export function hasPharmacyDispenseRecord(status: PharmacyDispenseStatus): boolean {
  return status !== "pending";
}
