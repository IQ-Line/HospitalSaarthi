import type {
  RegistrationListItem,
  RegistrationRecord,
} from "../domain/registration.types.js";

export interface RegistrationResponse {
  registration_id: string;
  iq_tenant_id: string;
  visit_id: string | null;
  patient_id: string;
  facility_id: string | null;
  visit_type: string | null;
  department_id: string | null;
  provider_id: string | null;
  appointment_id: string | null;
  registration_status: string;
  created_by: string | null;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface RegistrationListItemResponse extends RegistrationResponse {
  patient_uhid: string | null;
  patient_full_name: string | null;
  patient_phone_number: string | null;
}

export function serializeRegistration(row: RegistrationRecord): RegistrationResponse {
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

export function serializeRegistrationListItem(
  row: RegistrationListItem,
): RegistrationListItemResponse {
  return {
    ...serializeRegistration(row),
    patient_uhid: row.patient_uhid,
    patient_full_name: row.patient_full_name,
    patient_phone_number: row.patient_phone_number,
  };
}
