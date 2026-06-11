import type { OpdQueueProjectionRow, PharmacyQueueItem } from "../domain/pharmacy.types.js";
import { hasPharmacyDispenseRecord } from "./dispense-completion.js";

export function mapOpdQueueProjectionToQueueItem(row: OpdQueueProjectionRow): PharmacyQueueItem {
  return {
    walk_in_order: false,
    record_id: null,
    visit_id: row.visit_id,
    patient_id: row.patient_id,
    walk_in_patient_id: null,
    prescription_id: row.prescription_id,
    doctor_id: row.doctor_id,
    visit_status: row.visit_status,
    prescription_status: row.prescription_status,
    updated_at: row.queued_at.toISOString(),
    finalized_at: row.queued_at.toISOString(),
    medicine_count: row.medicine_count,
    patient_name: row.patient_name,
    uhid: row.uhid,
    phone: row.phone,
    age_years: row.age_years,
    gender: row.gender,
    doctor_name: row.doctor_name,
    formatted_visit_id: row.formatted_visit_id,
    has_dispense: hasPharmacyDispenseRecord(row.dispense_status),
    dispense_status: row.dispense_status,
  };
}
