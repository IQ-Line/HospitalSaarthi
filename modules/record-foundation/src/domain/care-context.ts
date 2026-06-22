export interface CareContext {
  id: string;
  iq_tenant_id: string;
  patient_id: string;
  source_origin: string;
  source_system_id: string;
  source_record_type: string;
  source_record_id: string | null;
  encounter_id: string | null;
  display: string;
  period_start: Date;
  period_end: Date | null;
  status: string;
  created_at: Date;
  updated_at: Date;
  created_by: string | null;
  updated_by: string | null;
}

export interface CreateCareContextData {
  patient_id: string;
  source_origin: string;
  source_system_id: string;
  source_record_type: string;
  source_record_id?: string;
  encounter_id?: string;
  display: string;
  period_start: Date;
  period_end?: Date;
  status?: string;
  created_by?: string;
}

export interface CareContextFilters {
  patient_id?: string;
  status?: string;
  /** Page size cap (defaults applied in the repo) + offset; bounds the list. */
  limit?: number;
  offset?: number;
}
