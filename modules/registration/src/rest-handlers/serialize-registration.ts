import type { Registration } from "../domain/registration.types.js";

export function serializeRegistration(row: Registration) {
  return {
    registration_id: row.registration_id,
    iq_tenant_id: row.iq_tenant_id,
    visit_id: row.visit_id,
    patient_id: row.patient_id,
    facility_id: row.facility_id,
    visit_type: row.visit_type,
    department_id: row.department_id,
    provider_id: row.provider_id,
    appointment_id: row.appointment_id,
    registration_status: row.registration_status,
    created_by: row.created_by,
    updated_by: row.updated_by,
    created_at: row.created_at.toISOString(),
    updated_at: row.updated_at.toISOString(),
  };
}
