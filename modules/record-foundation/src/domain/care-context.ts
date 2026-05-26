export type AbhaLinkageStatus = "not_linked" | "linkable" | "linked" | "revoked";
export type SourceOrigin = "platform_module" | "legacy_system" | "external_abdm";
export type SourceRecordType =
  | "opd_visit"
  | "ipd_admission"
  | "lab_report"
  | "prescription"
  | "radiology_report"
  | "discharge_summary"
  | "immunisation_record"
  | "wellness_record"
  | "health_document"
  | "external_record";
export type CareContextStatus = "draft" | "final" | "superseded" | "cancelled" | "archived";

export interface CareContext {
  id: string;
  iq_tenant_id: string;
  patient_id: string;
  abha_linkage_status: AbhaLinkageStatus;
  abdm_reference_number: string | null;
  source_origin: SourceOrigin;
  source_system_id: string;
  source_record_type: SourceRecordType;
  source_record_id: string | null;
  encounter_id: string | null;
  display: string;
  period_start: Date;
  period_end: Date | null;
  status: CareContextStatus;
  supersedes_id: string | null;
  sensitivity_labels: string[] | null;
  consent_disclosable: boolean;
  created_at: Date;
  updated_at: Date;
  created_by: string | null;
  updated_by: string | null;
  linked_at: Date | null;
  data_erase_at: Date | null;
}

export interface CreateCareContextData {
  iq_tenant_id: string;
  patient_id: string;
  source_origin: SourceOrigin;
  source_system_id: string;
  source_record_type: SourceRecordType;
  source_record_id?: string;
  encounter_id?: string;
  display: string;
  period_start: Date;
  period_end?: Date;
  sensitivity_labels?: string[];
  created_by?: string;
}

export interface CareContextFilters {
  patient_id: string;
  linked?: boolean;
  status?: CareContextStatus;
  source_origin?: SourceOrigin;
  source_record_type?: SourceRecordType;
  abha_linkage_status?: AbhaLinkageStatus;
}

export interface UpdateLinkageData {
  abha_linkage_status: string;
  abdm_reference_number?: string;
  linked_at?: string;
}
