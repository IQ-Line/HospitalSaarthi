export interface ExternalHealthRecord {
  id: string;
  iq_tenant_id: string;
  patient_id: string;
  care_context_id: string;
  bundle_manifest_id: string;
  consent_artifact_id: string;
  source_hip_id: string;
  source_hip_display_name: string | null;
  received_at: Date;
  display_summary: Record<string, unknown> | null;
  doctor_viewed_at: Date | null;
  data_erase_at: Date;
}

export interface IngestExternalRecordData {
  iq_tenant_id: string;
  patient_id: string;
  care_context_id: string;
  bundle_manifest_id: string;
  consent_artifact_id: string;
  source_hip_id: string;
  source_hip_display_name?: string;
  display_summary?: Record<string, unknown>;
  data_erase_at: Date;
}
