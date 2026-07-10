import type { CreateRxFormData } from '../types';

export type OpdPrescriptionStatus = 'draft' | 'final' | 'cancelled';

export interface OpdPrescriptionClinicalPayload {
  legacy_vitals?: Record<string, unknown> | null;
  vital_observations?: unknown[];
  chief_complaints?: Array<{
    line_no: number;
    complaint_text: string;
    duration_value?: string | null;
    duration_unit?: string | null;
    severity?: string | null;
    notes?: string | null;
  }>;
  diagnoses?: Array<{
    line_no: number;
    notes?: string | null;
    certainty?: string | null;
    diagnosis_id?: string | null;
  }>;
  symptoms?: unknown[];
  medical_history?: {
    smoking_status?: string | null;
    alcohol_status?: string | null;
    diet_type?: string | null;
    other_notes?: string | null;
  } | null;
  medical_history_allergies?: Array<{
    line_no: number;
    allergen_text: string;
    reaction_text?: string | null;
    severity?: string | null;
    notes?: string | null;
  }>;
  medical_history_chronic_illnesses?: Array<{
    line_no: number;
    illness_text: string;
    since_text?: string | null;
    notes?: string | null;
  }>;
  medicines?: unknown[];
  ordered_tests?: unknown[];
  ordered_imaging?: unknown[];
  vaccines_required?: Array<{
    line_no: number;
    vaccine_id?: string | null;
    vaccine_code?: string | null;
    name: string;
    due_by?: string | null;
    instructions?: string | null;
    status?: string;
  }>;
  advised_procedures?: unknown[];
  physical_activities?: Array<{
    line_no: number;
    steps_count?: number | null;
    sleep_duration_min?: number | null;
    calories_burned?: number | null;
    exercise_types?: string[];
  }>;
  care_plan?: {
    advice?: string | null;
    next_visit_value?: number | null;
    next_visit_unit?: string | null;
    refer_to?: string | null;
  } | null;
}

export interface OpdPrescriptionDetail {
  id: string;
  tenant_id: string;
  visit_id: string;
  patient_id: string;
  doctor_id: string;
  vitals_schema_version: number;
  status: OpdPrescriptionStatus;
  finalized_at: string | null;
  cancelled_at: string | null;
  created_at: string;
  updated_at: string;
  clinical: OpdPrescriptionClinicalPayload;
}

export interface OpdPrescriptionSingleResponse {
  data: OpdPrescriptionDetail;
}

export interface OpdPrescriptionListItem {
  id: string;
  tenant_id: string;
  visit_id: string;
  patient_id: string;
  doctor_id: string;
  status: OpdPrescriptionStatus;
  finalized_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface OpdPrescriptionListResponse {
  data: OpdPrescriptionListItem[];
  total: number;
}

export interface OpdPrescriptionCreateBody {
  visit_id: string;
  patient_id: string;
  vitals_schema_version?: number;
  created_by?: string | null;
  clinical: OpdPrescriptionClinicalPayload;
}

export interface OpdPrescriptionUpdateBody {
  doctor_id?: string | null;
  vitals_schema_version?: number | null;
  updated_by?: string | null;
  clinical?: OpdPrescriptionClinicalPayload | null;
}

export interface OpdPrescriptionFinalizeBody {
  changed_by?: string | null;
}

/** Normalized shape used by Create RX page. */
export interface OpdPrescriptionSession {
  prescription_id: string;
  visit_id: string;
  patient_id: string;
  prescription_status: OpdPrescriptionStatus;
  is_read_only: boolean;
  form_data: CreateRxFormData;
}
