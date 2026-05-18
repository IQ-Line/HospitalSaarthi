import type { IntakeCompletion, RegistrationStatus } from "../lib/registration-helpers.js";

export type { IntakeCompletion, RegistrationStatus } from "../lib/registration-helpers.js";

export interface PatientDemographicsSnapshot {
  uhid: string;
  abha_number?: string | null;
  abha_address?: string | null;
  full_name: string;
  phone_number: string;
  gender?: string | null;
  date_of_birth?: string | null;
  year_of_birth?: number | null;
}

export interface RegistrationRecord {
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
  provider_id: string | null;
  appointment_id: string | null;
  registration_status: RegistrationStatus;
  idempotency_key: string | null;
  created_by: string | null;
  updated_by: string | null;
  created_at: Date;
  updated_at: Date;
}

export interface CreateRegistrationInput {
  patient_id: string;
  patient_source_record_id: string;
  patient_snapshot: PatientDemographicsSnapshot;
  facility_id?: string | null;
  visit_type?: string | null;
  department_id?: string | null;
  provider_id?: string | null;
  appointment_id?: string | null;
  /** Desk visit-intake progress at create time (defaults to `pending`). */
  intake_completion?: IntakeCompletion;
}

export interface NewPatientIntakeInput {
  patient: Record<string, unknown>;
  facility_id?: string | null;
  visit_type?: string | null;
  department_id?: string | null;
  provider_id?: string | null;
  appointment_id?: string | null;
  intake_completion?: IntakeCompletion;
}

export interface ListRegistrationsParams {
  page: number;
  limit: number;
  /** Free-text: name (trgm), exact uhid, or phone */
  q?: string;
  /** @deprecated Use `q` — kept for transitional FE */
  uhid?: string;
  /** @deprecated Use `q` */
  mobile?: string;
  /** @deprecated Use `q` */
  name?: string;
  status?: RegistrationStatus;
  patient_id?: string;
  facility_id?: string;
  department_id?: string;
  provider_id?: string;
}

export type RegistrationListItem = RegistrationRecord;

export interface RegistrationListPage {
  data: RegistrationListItem[];
  total: number;
  page: number;
  limit: number;
  total_pages: number;
}

export interface InsertRegistrationResult {
  record: RegistrationRecord;
  created: boolean;
}

