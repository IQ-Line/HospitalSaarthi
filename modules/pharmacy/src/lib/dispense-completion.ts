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

function aggregateDispensedByMedicineId(
  lines: ReadonlyArray<Pick<SaveDispenseLineInput, "medicine_id" | "quantity_dispensed">>,
): Map<string, number> {
  const totals = new Map<string, number>();
  for (const line of lines) {
    const medicineId = line.medicine_id?.trim();
    const dispensed = parseQty(line.quantity_dispensed);
    if (!medicineId || dispensed == null) continue;
    totals.set(medicineId, (totals.get(medicineId) ?? 0) + dispensed);
  }
  return totals;
}

/** OPD visit dispense: partial when qty is short or a dispensable Rx medicine is missing. */
export function computeOpdDispenseFulfillmentStatus(
  dispensableMedicines: readonly OpdPrescriptionMedicineLine[],
  dispenseLines: readonly SaveDispenseLineInput[],
): DispenseFulfillmentStatus {
  for (const line of dispenseLines) {
    if (isLineQuantityShort(line.prescribed_quantity, line.quantity_dispensed)) {
      return "partial_issue";
    }
  }

  const dispensedByMedicineId = aggregateDispensedByMedicineId(dispenseLines);

  for (const medicine of dispensableMedicines) {
    const medicineId = medicine.medicine_id?.trim();
    if (!medicineId) continue;

    const dispensed = dispensedByMedicineId.get(medicineId) ?? 0;
    if (dispensed <= 0) {
      return "partial_issue";
    }

    const expectedFromRx = parseQty(medicine.quantity);
    if (isQuantityShort(dispensed, expectedFromRx)) {
      return "partial_issue";
    }
  }

  return "issued";
}

/** Walk-in dispense: partial only when a line qty is below its prescribed qty. */
export function computeWalkInDispenseFulfillmentStatus(
  dispenseLines: readonly SaveDispenseLineInput[],
): DispenseFulfillmentStatus {
  for (const line of dispenseLines) {
    if (isLineQuantityShort(line.prescribed_quantity, line.quantity_dispensed)) {
      return "partial_issue";
    }
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
