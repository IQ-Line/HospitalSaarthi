/** Visitpad catalog row shapes (snake_case, aligned with Master Data API). */

export interface VisitpadListResponse<T> {
  data: T[];
  total: number;
}

export interface VisitpadUnit {
  id: string;
  iq_tenant_id: number | null;
  code: string;
  display_name: string;
  dimension: string;
  ucum_code: string | null;
  is_canonical: boolean;
  display_order: number;
  is_active: boolean;
  is_deleted: boolean;
  created_by?: string | null;
  updated_by?: string | null;
  created_at: string;
  updated_at: string;
}

export interface VisitpadUnitConversion {
  id: string;
  iq_tenant_id: number | null;
  from_unit_code: string;
  to_unit_code: string;
  factor: number;
  offset_value: number;
  display_order: number;
  is_deleted: boolean;
  created_by?: string | null;
  updated_by?: string | null;
  created_at: string;
  updated_at: string;
}

export interface VisitpadVital {
  id: string;
  iq_tenant_id: number | null;
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
  created_by?: string | null;
  updated_by?: string | null;
  created_at: string;
  updated_at: string;
}

export interface VisitpadChiefComplaint {
  id: string;
  iq_tenant_id: number | null;
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
  created_by?: string | null;
  updated_by?: string | null;
  created_at: string;
  updated_at: string;
}

export interface VisitpadDiagnosis {
  id: string;
  iq_tenant_id: number | null;
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
  created_by?: string | null;
  updated_by?: string | null;
  created_at: string;
  updated_at: string;
}

export interface VisitpadAllergen {
  id: string;
  iq_tenant_id: number | null;
  code: string;
  display_name: string;
  allergen_type: string;
  drug_class?: string | null;
  reaction_severity_default?: string;
  snomed_code?: string | null;
  display_order: number;
  is_active: boolean;
  is_deleted: boolean;
  created_by?: string | null;
  updated_by?: string | null;
  created_at: string;
  updated_at: string;
}

export interface VisitpadAllergyReaction {
  id: string;
  iq_tenant_id: number | null;
  code: string;
  display_name: string;
  display_order: number;
  is_active: boolean;
  is_deleted: boolean;
  created_by?: string | null;
  updated_by?: string | null;
  created_at: string;
  updated_at: string;
}

export interface VisitpadRxColumn {
  id: string;
  iq_tenant_id: number | null;
  section: string;
  code: string;
  display_name: string;
  extra_unit?: string | null;
  display_order: number;
  is_active: boolean;
  is_deleted: boolean;
  created_by?: string | null;
  updated_by?: string | null;
  created_at: string;
  updated_at: string;
}

export interface VisitpadMedicine {
  id: string;
  iq_tenant_id: number | null;
  code: string;
  display_name: string;
  generic_name: string;
  short_name?: string | null;
  brand_names: string[];
  drug_class: string;
  drug_subclass?: string | null;
  dosage_form: string;
  route_of_admin: string[];
  strength_value?: number | null;
  strength_unit?: string | null;
  strength_display: string;
  concentration_value?: number | null;
  concentration_unit?: string | null;
  volume_per_unit?: number | null;
  sku_code?: string | null;
  barcode?: string | null;
  pack_size?: number | null;
  pack_unit?: string | null;
  manufacturer?: string | null;
  storage_condition?: string | null;
  expiry_tracking: boolean;
  is_dispensable: boolean;
  schedule: string;
  is_controlled_substance: boolean;
  is_narcotic: boolean;
  requires_prescription: boolean;
  is_restricted_antibiotic: boolean;
  allergen_classes: string[];
  contraindications: string[];
  search_tags: string[];
  atc_code?: string | null;
  rxnorm_code?: string | null;
  snomed_substance_code?: string | null;
  snomed_product_code?: string | null;
  pregnancy_category?: string | null;
  lactation_safety?: string | null;
  pediatric_use?: string | null;
  max_dose_per_day_value?: number | null;
  max_dose_per_day_unit?: string | null;
  black_box_warning: boolean;
  black_box_warning_text?: string | null;
  default_dose_value?: number | null;
  default_dose_unit?: string | null;
  default_frequency?: string | null;
  default_duration_days?: number | null;
  default_route?: string | null;
  default_instructions?: string | null;
  typical_quantity?: number | null;
  notes?: string | null;
  display_order: number;
  is_active: boolean;
  is_deleted: boolean;
  created_by?: string | null;
  updated_by?: string | null;
  created_at: string;
  updated_at: string;
}

export interface VisitpadChronicIllness {
  id: string;
  iq_tenant_id: number | null;
  icd10_code: string;
  display_name: string;
  category: string;
  snomed_code?: string | null;
  chronic_illness_prompt: boolean;
  display_order: number;
  is_active: boolean;
  is_deleted: boolean;
  created_by?: string | null;
  updated_by?: string | null;
  created_at: string;
  updated_at: string;
}

export interface VisitpadProcedure {
  id: string;
  iq_tenant_id: number | null;
  cpt_code: string;
  short_name?: string | null;
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
  created_by?: string | null;
  updated_by?: string | null;
  created_at: string;
  updated_at: string;
}
