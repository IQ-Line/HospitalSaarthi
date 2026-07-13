import type { PharmacyQueueItem, QueueProjectionRow } from "../domain/pharmacy.types.js";
import { hasPharmacyDispenseRecord } from "./dispense-completion.js";

export function mapQueueProjectionToQueueItem(row: QueueProjectionRow): PharmacyQueueItem {
  const queuedAt = row.queued_at.toISOString();
  return {
    walk_in_order: false,
    record_id: null,
    visit_id: row.encounter_id,
    patient_id: row.patient_id,
    walk_in_patient_id: null,
    prescription_id: row.prescription_id,
    doctor_id: row.doctor_id,
    visit_status: row.visit_status,
    prescription_status: row.prescription_status,
    updated_at: queuedAt,
    queued_at: queuedAt,
    finalized_at: queuedAt,
    medicine_count: row.medicine_count,
    priority: row.priority,
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

/** @deprecated Use `mapQueueProjectionToQueueItem`. */
export const mapOpdQueueProjectionToQueueItem = mapQueueProjectionToQueueItem;
