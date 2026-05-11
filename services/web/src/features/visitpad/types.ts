/** Visitpad catalog row shapes (snake_case, aligned with Master Data API). */

export interface VisitpadListResponse<T> {
  data: T[];
  total: number;
}

export interface VisitpadUnit {
  id: string;
  tenant_id: string;
  code: string;
  display_label: string;
  dimension: string;
  ucum_code: string | null;
  is_canonical: boolean;
  display_order: number;
  is_active: boolean;
  is_deleted: boolean;
  created_at: string;
  updated_at: string;
}

export interface VisitpadUnitConversion {
  id: string;
  tenant_id: string;
  from_unit_code: string;
  to_unit_code: string;
  factor: number;
  offset_value: number;
  display_order: number;
  is_deleted: boolean;
  created_at: string;
  updated_at: string;
}

export interface VisitpadVital {
  id: string;
  tenant_id: string;
  code: string;
  name: string;
  short_name: string;
  category: string;
  data_type: string;
  unit: string;
  default_unit_code: string;
  allowed_units?: unknown[];
  reference_kind?: string;
  reference_json?: Record<string, unknown>;
  normal_range_adult?: Record<string, unknown>;
  normal_range_paediatric?: Record<string, unknown>;
  input_method?: string;
  is_paired?: boolean;
  pair_code?: string | null;
  critical_low?: number | null;
  critical_high?: number | null;
  loinc_code?: string | null;
  snomed_observable_code?: string | null;
  display_order: number;
  is_active: boolean;
  is_deleted: boolean;
  created_at: string;
  updated_at: string;
}

export interface VisitpadChiefComplaint {
  id: string;
  tenant_id: string;
  code: string;
  display_name: string;
  body_system: string;
  triage_priority: string;
  synonyms?: string[];
  is_paediatric_relevant?: boolean;
  snomed_code?: string | null;
  display_order: number;
  is_active: boolean;
  is_deleted: boolean;
  created_at: string;
  updated_at: string;
}

export interface VisitpadDiagnosis {
  id: string;
  tenant_id: string;
  icd10_code: string;
  icd_version?: string;
  official_descriptor?: string;
  display_name: string;
  category: string;
  is_chronic_flag?: boolean;
  is_notifiable?: boolean;
  snomed_code?: string | null;
  display_order: number;
  is_active: boolean;
  is_deleted: boolean;
  created_at: string;
  updated_at: string;
}

export interface VisitpadAllergen {
  id: string;
  tenant_id: string;
  code: string;
  display_name: string;
  allergen_type: string;
  drug_class?: string | null;
  reaction_severity_default?: string;
  snomed_code?: string | null;
  display_order: number;
  is_active: boolean;
  is_deleted: boolean;
  created_at: string;
  updated_at: string;
}

export interface VisitpadAllergyReaction {
  id: string;
  tenant_id: string;
  code: string;
  display_name: string;
  display_order: number;
  is_active: boolean;
  is_deleted: boolean;
  created_at: string;
  updated_at: string;
}

export interface VisitpadRxColumn {
  id: string;
  tenant_id: string;
  section: string;
  code: string;
  display_name: string;
  extra_unit?: string | null;
  display_order: number;
  is_active: boolean;
  is_deleted: boolean;
  created_at: string;
  updated_at: string;
}

export interface VisitpadMedicine {
  id: string;
  tenant_id: string;
  code: string;
  display_name: string;
  generic_name: string;
  drug_class?: string;
  dosage_form?: string;
  schedule: string;
  display_order: number;
  is_active: boolean;
  is_deleted: boolean;
  created_at: string;
  updated_at: string;
}

export interface VisitpadChronicIllness {
  id: string;
  tenant_id: string;
  icd10_code: string;
  display_name: string;
  category: string;
  snomed_code?: string | null;
  display_order: number;
  is_active: boolean;
  is_deleted: boolean;
  created_at: string;
  updated_at: string;
}

export interface VisitpadProcedure {
  id: string;
  tenant_id: string;
  cpt_code: string;
  display_name: string;
  official_descriptor?: string;
  category: string;
  billing_category: string;
  duration_minutes?: number;
  requires_consent?: boolean;
  type_modality?: string | null;
  snomed_code?: string | null;
  display_order: number;
  is_active: boolean;
  is_deleted: boolean;
  created_at: string;
  updated_at: string;
}
