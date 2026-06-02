import type { RegistrationRecord } from "../domain/registration.types.js";

export interface RegistrationResponse {
  registration_id: string;
  iq_tenant_id: string;
  visit_id: string | null;
  patient_id: string;
  patient_uhid: string;
  patient_abha_number: string | null;
  patient_abha_address: string | null;
  patient_full_name: string;
  patient_phone_number: string;
  patient_gender: string | null;
  patient_date_of_birth: string | null;
  patient_year_of_birth: number | null;
  patient_source_record_id: string;
  facility_id: string | null;
  visit_type: string | null;
  visit_type_label: string | null;
  department_id: string | null;
  provider_id: string | null;
  appointment_id: string | null;
  registration_status: string;
  registration_status_label: string | null;
  created_by: string | null;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface PicklistLabelMaps {
  visitTypes: ReadonlyMap<string, string>;
  registrationStatuses: ReadonlyMap<string, string>;
}

function resolveLabel(
  slug: string | null | undefined,
  map: ReadonlyMap<string, string>,
): string | null {
  if (!slug) return null;
  return map.get(slug) ?? slug;
}

export function serializeRegistration(
  row: RegistrationRecord,
  labelMaps?: PicklistLabelMaps,
): RegistrationResponse {
  return {
    registration_id: row.registration_id,
    iq_tenant_id: row.iq_tenant_id,
    visit_id: row.visit_id,
    patient_id: row.patient_id,
    patient_uhid: row.patient_uhid,
    patient_abha_number: row.patient_abha_number,
    patient_abha_address: row.patient_abha_address,
    patient_full_name: row.patient_full_name,
    patient_phone_number: row.patient_phone_number,
    patient_gender: row.patient_gender,
    patient_date_of_birth: row.patient_date_of_birth,
    patient_year_of_birth: row.patient_year_of_birth,
    patient_source_record_id: row.patient_source_record_id,
    facility_id: row.facility_id,
    visit_type: row.visit_type,
    visit_type_label: labelMaps
      ? resolveLabel(row.visit_type, labelMaps.visitTypes)
      : null,
    department_id: row.department_id,
    provider_id: row.provider_id,
    appointment_id: row.appointment_id,
    registration_status: row.registration_status,
    registration_status_label: labelMaps
      ? resolveLabel(row.registration_status, labelMaps.registrationStatuses)
      : null,
    created_by: row.created_by,
    updated_by: row.updated_by,
    created_at: row.created_at.toISOString(),
    updated_at: row.updated_at.toISOString(),
  };
}
