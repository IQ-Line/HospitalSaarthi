import type { IntakeCompletion } from "../lib/registration-helpers.js";

export type { IntakeCompletion } from "../lib/registration-helpers.js";

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
}

import type { ConsultationType } from "../lib/follow-up.js";

export interface NewPatientIntakeInput {
  patient: Record<string, unknown>;
  permanent_address?: Record<string, unknown>;
  facility_id?: string | null;
  visit_type?: string | null;
  consultation_type?: ConsultationType | null;
  department_id?: string | null;
  doctor_id?: string | null;
  appointment_id?: string | null;
  intake_completion?: IntakeCompletion;
}

export interface OpdRegistrationBillingInput {
  registration_fee?: {
    item_code?: string | null;
    line_discount_percentage?: number;
  } | null;
  consultation_fee?: {
    item_code?: string | null;
    line_discount_percentage?: number;
  } | null;
  department_name?: string | null;
  invoice_discount?: number;
  amount_paid?: number;
  payment_method?: "CASH" | "CARD" | "UPI" | "CHEQUE" | "BANK_TRANSFER" | null;
  payment_notes?: string | null;
}

export interface OpdRegistrationCompleteInput extends NewPatientIntakeInput {
  billing?: OpdRegistrationBillingInput;
}

export interface ExistingPatientVisitInput {
  patient_id: string;
  /** Desk-captured ABHA fields (EMPI may not have address on patient row yet). */
  abha_number?: string | null;
  abha_address?: string | null;
  /** Desk-captured ABHA / DOB overlay when re-visiting an existing EMPI patient. */
  patient?: Record<string, unknown>;
  permanent_address?: Record<string, unknown>;
  facility_id?: string | null;
  visit_type?: string | null;
  consultation_type?: ConsultationType | null;
  department_id?: string | null;
  doctor_id?: string | null;
  appointment_id?: string | null;
  intake_completion?: IntakeCompletion;
}

export interface ListRegistrationsParams {
  page: number;
  limit: number;
  q?: string;
  uhid?: string;
  mobile?: string;
  name?: string;
  abha_number?: string;
  abha_address?: string;
  patient_id?: string;
}

export type RegistrationListItem = RegistrationWithVisitRecord;

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

export interface RegistrationWithVisitRecord {
  registration: RegistrationRecord | null;
  visit: import("./visit.types.js").VisitRecord | null;
}
