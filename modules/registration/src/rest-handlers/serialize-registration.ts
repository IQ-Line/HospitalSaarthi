import type { RegistrationRecord, RegistrationWithVisitRecord } from "../domain/registration.types.js";
import type { VisitRecord } from "../domain/visit.types.js";

export interface VisitResponse {
  visit_id: string;
  iq_tenant_id: string;
  patient_id: string;
  visit_type: string | null;
  status: string;
  facility_id: string | null;
  department_id: string | null;
  doctor_id: string | null;
  appointment_id: string | null;
  created_by: string | null;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
}

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
  department_id: string | null;
  doctor_id: string | null;
  appointment_id: string | null;
  registration_status: string;
  created_by: string | null;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
}

export function serializeVisit(row: VisitRecord): VisitResponse {
  return {
    visit_id: row.visit_id,
    iq_tenant_id: row.iq_tenant_id,
    patient_id: row.patient_id,
    visit_type: row.visit_type,
    status: row.status,
    facility_id: row.facility_id,
    department_id: row.department_id,
    doctor_id: row.doctor_id,
    appointment_id: row.appointment_id,
    created_by: row.created_by,
    updated_by: row.updated_by,
    created_at: row.created_at.toISOString(),
    updated_at: row.updated_at.toISOString(),
  };
}

export function serializeRegistration(row: RegistrationRecord): RegistrationResponse {
  return {
    registration_id: row.registration_id,
    iq_tenant_id: row.iq_tenant_id,
    visit_id: null,
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
    facility_id: null,
    visit_type: null,
    department_id: null,
    doctor_id: null,
    appointment_id: null,
    registration_status: "pending",
    created_by: row.created_by,
    updated_by: row.updated_by,
    created_at: row.created_at.toISOString(),
    updated_at: row.updated_at.toISOString(),
  };
}

export function serializeRegistrationWithVisit(
  input: RegistrationWithVisitRecord,
): RegistrationResponse {
  const { registration, visit } = input;
  const base = registration
    ? serializeRegistration(registration)
    : {
        registration_id: "",
        iq_tenant_id: visit.iq_tenant_id,
        visit_id: visit.visit_id,
        patient_id: visit.patient_id,
        patient_uhid: "",
        patient_abha_number: null,
        patient_abha_address: null,
        patient_full_name: "",
        patient_phone_number: "",
        patient_gender: null,
        patient_date_of_birth: null,
        patient_year_of_birth: null,
        patient_source_record_id: "",
        facility_id: visit.facility_id,
        visit_type: visit.visit_type,
        department_id: visit.department_id,
        doctor_id: visit.doctor_id,
        appointment_id: visit.appointment_id,
        registration_status: visit.status,
        created_by: visit.created_by,
        updated_by: visit.updated_by,
        created_at: visit.created_at.toISOString(),
        updated_at: visit.updated_at.toISOString(),
      };

  return {
    ...base,
    visit_id: visit.visit_id,
    facility_id: visit.facility_id,
    visit_type: visit.visit_type,
    department_id: visit.department_id,
    doctor_id: visit.doctor_id,
    appointment_id: visit.appointment_id,
    registration_status: visit.status,
    created_by: visit.created_by ?? base.created_by,
    updated_by: visit.updated_by ?? base.updated_by,
    created_at: visit.created_at.toISOString(),
    updated_at: visit.updated_at.toISOString(),
  };
}
