export interface Bundle {
  id: string;
  iq_tenant_id: string;
  care_context_id: string;
  bundle_kind: string;
  fhir_profile_url: string;
  fhir_profile_version: string;
  producer_kind: string;
  producer_id: string;
  bundle_json: Record<string, unknown>;
  bundle_size_bytes: number;
  produced_at: Date;
  stored_at: Date;
  created_at: Date;
  updated_at: Date;
  created_by: string | null;
  updated_by: string | null;
}

export interface CreateBundleData {
  care_context_id: string;
  bundle_kind: string;
  fhir_profile_url: string;
  fhir_profile_version: string;
  producer_kind: string;
  producer_id: string;
  bundle_json: Record<string, unknown>;
  bundle_size_bytes: number;
  produced_at: Date;
}
