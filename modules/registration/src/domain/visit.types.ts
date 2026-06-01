import type { IntakeCompletion, VisitStatus } from "../lib/visit-helpers.js";

export type { IntakeCompletion, VisitStatus } from "../lib/visit-helpers.js";

export interface VisitRecord {
  visit_id: string;
  iq_tenant_id: string;
  patient_id: string;
  visit_type: string | null;
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
  facility_id?: string | null;
  department_id?: string | null;
  doctor_id?: string | null;
  appointment_id?: string | null;
  /** Desk visit-intake progress at create time (defaults to `pending`). */
  intake_completion?: IntakeCompletion;
}

export interface UpdateVisitInput {
  visit_type?: string | null;
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
