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
  diagnoses?: unknown[];
  symptoms?: unknown[];
  medical_history?: {
    smoking_status?: string | null;
    alcohol_status?: string | null;
    diet_type?: string | null;
    other_notes?: string | null;
  } | null;
  medical_history_allergies?: unknown[];
  medical_history_chronic_illnesses?: unknown[];
  medicines?: unknown[];
  ordered_tests?: unknown[];
  ordered_imaging?: unknown[];
  vaccines_required?: unknown[];
  advised_procedures?: unknown[];
  physical_activities?: unknown[];
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
  tenant_id: string;
  visit_id: string;
  patient_id: string;
  doctor_id: string;
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
