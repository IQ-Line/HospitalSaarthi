export interface CareContextRow {
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

export interface CareContextFilters {
  patient_id?: string;
  status?: string;
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

export interface CareContextRepo {
  insert(data: CreateCareContextData & { iqTenantId: string }): Promise<CareContextRow>;
  findAll(
    tenantId: string,
    filters?: CareContextFilters,
  ): Promise<{ data: CareContextRow[]; total: number }>;
  findById(tenantId: string, id: string): Promise<CareContextRow | null>;
}

export interface BundleRow {
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

export interface BundleRepo {
  insert(data: CreateBundleData & { iqTenantId: string }): Promise<BundleRow>;
  findById(tenantId: string, id: string): Promise<BundleRow | null>;
  findByCareContextId(tenantId: string, careContextId: string): Promise<BundleRow[]>;
}
