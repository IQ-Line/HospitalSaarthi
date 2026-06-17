import type { IntakeCompletion, VisitStatus } from "../lib/visit-helpers.js";
import type { ConsultationType, FreeFollowUpDetails } from "../lib/follow-up.js";

export type { IntakeCompletion, VisitStatus } from "../lib/visit-helpers.js";

export interface VisitRecord {
  id: string;
  visit_id: string;
  iq_tenant_id: string;
  patient_id: string;
  visit_type: string | null;
  consultation_type: ConsultationType;
  is_free_follow_up: boolean;
  free_follow_up_visit_count: number;
  free_follow_up_valid_till: Date | null;
  free_follow_up_details: FreeFollowUpDetails | null;
  parent_visit_id: string | null;
  status: VisitStatus;
  facility_id: string | null;
  department_id: string | null;
  doctor_id: string | null;
  appointment_id: string | null;
  idempotency_key: string | null;
  created_by: string | null;
  updated_by: string | null;
  created_at: Date;
  updated_at: Date;
}

export interface CreateVisitInput {
  patient_id: string;
  visit_type?: string | null;
  consultation_type?: ConsultationType | null;
  facility_id?: string | null;
  department_id?: string | null;
  doctor_id?: string | null;
  appointment_id?: string | null;
  intake_completion?: IntakeCompletion;
  is_free_follow_up?: boolean;
  free_follow_up_visit_count?: number;
  free_follow_up_valid_till?: Date | null;
  free_follow_up_details?: FreeFollowUpDetails | null;
  parent_visit_id?: string | null;
}

export interface UpdateVisitInput {
  visit_type?: string | null;
  consultation_type?: ConsultationType | null;
  facility_id?: string | null;
  department_id?: string | null;
  doctor_id?: string | null;
  appointment_id?: string | null;
}

export interface ListVisitsParams {
  page: number;
  limit: number;
  status?: VisitStatus;
  patient_id?: string;
  facility_id?: string;
  department_id?: string;
  doctor_id?: string;
  /** Inclusive calendar-date filter on `updated_at` (YYYY-MM-DD). */
  updated_from?: string;
  /** Inclusive calendar-date filter on `updated_at` (YYYY-MM-DD). */
  updated_to?: string;
}

export interface VisitListPage {
  data: VisitRecord[];
  total: number;
  page: number;
  limit: number;
  total_pages: number;
}

export interface InsertVisitResult {
  record: VisitRecord;
  created: boolean;
}

export interface VisitTypeDecisionPatientPayload {
  patient_id?: string;
  uhid?: string;
  abha_number?: string;
  abha_address?: string;
  phone_number?: string;
  first_name?: string;
  middle_name?: string;
  last_name?: string;
  gender?: string;
  date_of_birth?: string;
  age_years?: number;
  age_months?: number;
  age_days?: number;
}
