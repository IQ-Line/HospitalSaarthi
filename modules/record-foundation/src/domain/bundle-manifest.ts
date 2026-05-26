export type BundleKind =
  | "OpConsultRecord"
  | "Prescription"
  | "DischargeSummary"
  | "DiagnosticReport"
  | "HealthDocumentRecord"
  | "ImmunizationRecord"
  | "WellnessRecord";
export type ProducerKind = "platform_module" | "external_hip";
export type ValidationStatus = "pending" | "valid" | "invalid" | "not_validated";

export interface BundleManifest {
  id: string;
  iq_tenant_id: string;
  care_context_id: string;
  bundle_kind: BundleKind;
  fhir_profile_url: string;
  fhir_profile_version: string;
  producer_kind: ProducerKind;
  producer_id: string;
  validation_status: ValidationStatus;
  validation_errors: Record<string, unknown> | null;
  bundle_storage_id: string;
  bundle_size_bytes: number;
  bundle_hash: string;
  signature_storage_ref: string | null;
  produced_at: Date;
  received_at: Date | null;
  stored_at: Date;
}

export interface CreateBundleManifestData {
  iq_tenant_id: string;
  care_context_id: string;
  bundle_kind: BundleKind;
  fhir_profile_url: string;
  fhir_profile_version: string;
  producer_kind: ProducerKind;
  producer_id: string;
  bundle_storage_id: string;
  bundle_size_bytes: number;
  bundle_hash: string;
  produced_at: Date;
  received_at?: Date;
}
