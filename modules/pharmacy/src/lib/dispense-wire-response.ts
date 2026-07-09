import type {
  DispenseForVisitResponse,
  DispenseLineItem,
  DispenseLineItemRecord,
  DispenseRecord,
  OpdPrescriptionMedicineLine,
  OpdPrescriptionSnapshot,
  OpdQueueProjectionRow,
  QueueProjectionRow,
  PharmacyDispenseStatus,
  SaveDispenseLineInput,
  WalkInDispenseResponse,
  WalkInPatient,
  WalkInPatientRecord,
} from "../domain/pharmacy.types.js";
import { patientSummaryFromQueueProjection } from "./dispense-patient-display.js";
import { computeRecordAmounts } from "./dispense-amounts.js";
import {
  computeOpdDispenseFulfillmentStatus,
  computeWalkInDispenseFulfillmentStatus,
} from "./dispense-completion.js";

export function mapDispenseLineToWire(line: DispenseLineItemRecord): DispenseLineItem {
  return {
    id: line.id,
    medicine_id: line.medicine_id,
    medicine_display_name: line.medicine_display_name,
    prescribed_quantity: line.prescribed_quantity,
    quantity_dispensed: line.quantity_dispensed,
    unit_amount: line.unit_amount,
    line_discount: line.line_discount,
    tax_percent: line.tax_percent,
    tax_amount: line.tax_amount,
    line_total: line.line_total,
  };
}

export function mapWalkInPatientToWire(patient: WalkInPatientRecord): WalkInPatient {
  return {
    id: patient.id,
    first_name: patient.first_name,
    last_name: patient.last_name,
    phone: patient.phone,
    gender: patient.gender,
    date_of_birth: patient.date_of_birth,
    created_at: patient.created_at.toISOString(),
  };
}

export function linesToSaveInput(lines: readonly DispenseLineItem[]): SaveDispenseLineInput[] {
  return lines.map((line) => ({
    medicine_id: line.medicine_id ?? "",
    medicine_display_name: line.medicine_display_name,
    prescribed_quantity: line.prescribed_quantity,
    quantity_dispensed: line.quantity_dispensed,
    unit_amount: line.unit_amount,
    line_discount: line.line_discount,
    tax_percent: line.tax_percent,
  }));
}

export function amountsFromVisibleLines(
  lines: readonly DispenseLineItem[],
  billDiscount: string,
): Pick<DispenseForVisitResponse, "subtotal" | "discount" | "total_amount"> {
  return computeRecordAmounts(
    lines.map((line) => ({ line_total: line.line_total })),
    billDiscount,
  );
}

export function recomputeOpdDispenseStatus(
  dispensableMedicines: readonly OpdPrescriptionMedicineLine[],
  prescriptionMedicineCount: number,
  visibleLines: readonly DispenseLineItem[],
): PharmacyDispenseStatus {
  if (visibleLines.length === 0) {
    return "pending";
  }
  return computeOpdDispenseFulfillmentStatus(
    dispensableMedicines,
    linesToSaveInput(visibleLines),
    prescriptionMedicineCount,
  );
}

export function recomputeWalkInDispenseStatus(
  visibleLines: readonly DispenseLineItem[],
): PharmacyDispenseStatus {
  if (visibleLines.length === 0) {
    return "pending";
  }
  return computeWalkInDispenseFulfillmentStatus(linesToSaveInput(visibleLines));
}

export function buildVisitDispenseResponse(input: {
  visitId: string;
  opdPrescription: OpdPrescriptionSnapshot;
  dispensableMedicines: OpdPrescriptionMedicineLine[];
  record: DispenseRecord | null | undefined;
  rawLines: DispenseLineItemRecord[];
  queueProjection?: QueueProjectionRow | null;
}): DispenseForVisitResponse {
  const wireLines = input.rawLines.map(mapDispenseLineToWire);
  const hasRecord = input.record != null;
  const patientSummary = patientSummaryFromQueueProjection(input.queueProjection);

  const amounts = hasRecord
    ? amountsFromVisibleLines(wireLines, input.record!.discount)
    : { subtotal: "0.0000", discount: "0.0000", total_amount: "0.0000" };

  const dispense_status: PharmacyDispenseStatus = hasRecord
    ? recomputeOpdDispenseStatus(
        input.dispensableMedicines,
        input.opdPrescription.medicines.length,
        wireLines,
      )
    : "pending";

  return {
    visit_id: input.visitId,
    patient_id: input.record?.patient_id ?? input.opdPrescription.patient_id,
    opd_prescription_id:
      input.record?.opd_prescription_id ?? input.opdPrescription.prescription_id,
    subtotal: amounts.subtotal,
    discount: amounts.discount,
    total_amount: amounts.total_amount,
    notes: input.record?.notes ?? null,
    has_dispense: hasRecord,
    dispense_status,
    record_id: input.record?.id ?? null,
    created_at: input.record?.created_at.toISOString() ?? null,
    lines: wireLines,
    opd_prescription: input.opdPrescription,
    dispensable_medicines: [...input.dispensableMedicines],
    patient_name: patientSummary.patient_name,
    uhid: patientSummary.uhid,
    age_years: patientSummary.age_years,
    gender: patientSummary.gender,
    formatted_visit_id: patientSummary.formatted_visit_id,
  };
}

export function buildWalkInDispenseResponse(input: {
  record: DispenseRecord;
  patient: WalkInPatientRecord;
  rawLines: DispenseLineItemRecord[];
}): WalkInDispenseResponse {
  const wireLines = input.rawLines.map(mapDispenseLineToWire);
  const amounts = amountsFromVisibleLines(wireLines, input.record.discount);

  return {
    record_id: input.record.id,
    walk_in_order: true,
    walk_in_patient: mapWalkInPatientToWire(input.patient),
    subtotal: amounts.subtotal,
    discount: amounts.discount,
    total_amount: amounts.total_amount,
    notes: input.record.notes,
    has_dispense: true,
    dispense_status: recomputeWalkInDispenseStatus(wireLines),
    created_at: input.record.created_at.toISOString(),
    lines: wireLines,
  };
}
