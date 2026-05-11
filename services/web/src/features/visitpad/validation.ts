import { z } from 'zod';

function visitpadTrimLower(code: string): string {
  return code.trim().toLowerCase();
}

/** OpenAPI `VisitpadUnitDimension` */
export const visitpadUnitDimensionSchema = z.enum([
  'length',
  'mass',
  'volume',
  'time',
  'temperature',
  'pressure',
  'concentration',
  'ratio',
  'count',
  'other',
]);

export const visitpadUnitCreateSchema = z.object({
  code: z
    .string()
    .min(1)
    .max(64)
    .transform(visitpadTrimLower),
  display_label: z.string().min(1).max(256),
  dimension: visitpadUnitDimensionSchema,
  ucum_code: z.string().max(64).nullable().optional(),
  is_canonical: z.boolean().optional(),
  display_order: z.coerce.number().int().optional(),
  is_active: z.boolean().optional(),
});

export const visitpadUnitUpdateSchema = z
  .object({
    display_label: z.string().min(1).max(256).nullable().optional(),
    dimension: visitpadUnitDimensionSchema.nullable().optional(),
    ucum_code: z.string().max(64).nullable().optional(),
    is_canonical: z.boolean().nullable().optional(),
    display_order: z.coerce.number().int().nullable().optional(),
    is_active: z.boolean().nullable().optional(),
  })
  .strict();

/** Edit form (all fields shown in dialog — maps to `VisitpadUnitUpdate` on save). */
export const visitpadUnitEditFormSchema = z.object({
  display_label: z.string().min(1).max(256),
  dimension: visitpadUnitDimensionSchema,
  ucum_code: z.string().max(64).optional(),
  is_canonical: z.boolean(),
  display_order: z.coerce.number().int(),
  is_active: z.boolean(),
});

export const visitpadUnitConversionCreateSchema = z
  .object({
    from_unit_code: z
      .string()
      .min(1)
      .max(64)
      .transform(visitpadTrimLower),
    to_unit_code: z
      .string()
      .min(1)
      .max(64)
      .transform(visitpadTrimLower),
    factor: z.coerce.number().finite(),
    offset_value: z.coerce.number().finite().optional(),
    display_order: z.coerce.number().int().optional(),
  })
  .refine((d) => d.from_unit_code !== d.to_unit_code, {
    message: 'From and to unit codes must differ',
    path: ['to_unit_code'],
  });

export const visitpadUnitConversionEditFormSchema = z
  .object({
    from_unit_code: z
      .string()
      .min(1)
      .max(64)
      .transform(visitpadTrimLower),
    to_unit_code: z
      .string()
      .min(1)
      .max(64)
      .transform(visitpadTrimLower),
    factor: z.coerce.number().finite(),
    offset_value: z.coerce.number().finite(),
    display_order: z.coerce.number().int(),
  })
  .refine((d) => d.from_unit_code !== d.to_unit_code, {
    message: 'From and to unit codes must differ',
    path: ['to_unit_code'],
  });

export const visitpadVitalCategorySchema = z.enum([
  'vital_signs',
  'anthropometric',
  'functional',
  'score',
  'other',
]);

export const visitpadVitalDataTypeSchema = z.enum(['numeric', 'text', 'boolean', 'score']);

export const visitpadVitalReferenceKindSchema = z.enum(['none', 'range', 'categorical', 'boolean']);

export const visitpadVitalInputMethodSchema = z.enum(['manual', 'device', 'calculated']);

export const visitpadVitalCreateSchema = z.object({
  code: z.string().min(1).max(64),
  name: z.string().min(1).max(256),
  short_name: z.string().min(1).max(64),
  category: visitpadVitalCategorySchema,
  data_type: visitpadVitalDataTypeSchema,
  unit: z.string().min(1).max(128),
  default_unit_code: z.string().min(1).max(64),
  reference_kind: visitpadVitalReferenceKindSchema,
  input_method: visitpadVitalInputMethodSchema,
  allowed_units: z.array(z.string()).optional(),
  reference_json: z.record(z.unknown()).optional(),
  normal_range_adult: z.record(z.unknown()).optional(),
  normal_range_paediatric: z.record(z.unknown()).optional(),
  is_paired: z.boolean().optional(),
  pair_code: z.string().max(64).nullable().optional(),
  critical_low: z.number().nullable().optional(),
  critical_high: z.number().nullable().optional(),
  display_order: z.coerce.number().int().optional(),
  is_active: z.boolean().optional(),
  loinc_code: z.string().max(32).nullable().optional(),
  snomed_observable_code: z.string().max(64).nullable().optional(),
});

export const visitpadMedicineCreateCoreSchema = z.object({
  code: z.string().min(1).max(64),
  display_name: z.string().min(1).max(512),
  generic_name: z.string().min(1).max(512),
  drug_class: z.string().min(1).max(256),
  dosage_form: z.string().min(1).max(128),
  schedule: z.enum(['otc', 'h', 'h1', 's', 'x', 'unscheduled']),
});

export const visitpadMedicineEditCoreSchema = visitpadMedicineCreateCoreSchema.extend({
  is_active: z.boolean(),
  display_order: z.coerce.number().int(),
});

const finiteNumberOrNull = z.custom<number | null>(
  (v) => v === null || (typeof v === 'number' && v === v),
  { message: 'Must be a finite number or empty' },
);

export const visitpadVitalEditFormSchema = z.object({
  name: z.string().min(1).max(256),
  short_name: z.string().min(1).max(64),
  category: visitpadVitalCategorySchema,
  data_type: visitpadVitalDataTypeSchema,
  unit: z.string().min(1).max(128),
  default_unit_code: z.string().min(1).max(64),
  reference_kind: visitpadVitalReferenceKindSchema,
  input_method: visitpadVitalInputMethodSchema,
  is_paired: z.boolean(),
  pair_code: z.string().max(64).nullable().optional(),
  critical_low: finiteNumberOrNull.optional(),
  critical_high: finiteNumberOrNull.optional(),
  display_order: z.coerce.number().int(),
  is_active: z.boolean(),
  loinc_code: z.string().max(32).nullable().optional(),
  snomed_observable_code: z.string().max(64).nullable().optional(),
});

export const visitpadChiefComplaintEditFormSchema = z.object({
  code: z.string().min(1).max(64),
  display_name: z.string().min(1).max(256),
  body_system: z.enum([
    'cardiovascular',
    'respiratory',
    'neurological',
    'gastrointestinal',
    'musculoskeletal',
    'ent',
    'skin',
    'psychiatric',
    'other',
  ]),
  triage_priority: z.enum(['urgent', 'semi_urgent', 'non_urgent', 'routine']),
  snomed_code: z.string().max(64).nullable().optional(),
  is_paediatric_relevant: z.boolean(),
  display_order: z.coerce.number().int(),
  is_active: z.boolean(),
  /** One synonym per line (max 50 non-empty lines). */
  synonyms_text: z.string().max(8000).optional(),
});

export const visitpadDiagnosisEditFormSchema = z.object({
  icd10_code: z.string().min(1).max(16),
  icd_version: z.enum(['ICD-10', 'ICD-11']),
  official_descriptor: z.string().min(1).max(512),
  display_name: z.string().min(1).max(512),
  category: z.enum(['general', 'infectious', 'neoplastic', 'metabolic', 'psychiatric', 'injury', 'other']),
  is_chronic_flag: z.boolean(),
  is_notifiable: z.boolean(),
  snomed_code: z.string().max(64).nullable().optional(),
  display_order: z.coerce.number().int(),
  is_active: z.boolean(),
});

export const visitpadAllergenEditFormSchema = z.object({
  code: z.string().min(1).max(64),
  display_name: z.string().min(1).max(256),
  allergen_type: z.enum(['drug', 'food', 'environmental', 'other']),
  drug_class: z.string().max(256).nullable().optional(),
  reaction_severity_default: z.enum(['mild', 'moderate', 'severe', 'unknown']),
  snomed_code: z.string().max(64).nullable().optional(),
  display_order: z.coerce.number().int(),
  is_active: z.boolean(),
});

export const visitpadAllergyReactionEditFormSchema = z.object({
  code: z.string().min(1).max(64),
  display_name: z.string().min(1).max(256),
  display_order: z.coerce.number().int(),
  is_active: z.boolean(),
});

export const visitpadRxColumnEditFormSchema = z.object({
  code: z.string().min(1).max(64),
  display_name: z.string().min(1).max(256),
  extra_unit: z.string().max(128).nullable().optional(),
  display_order: z.coerce.number().int(),
  is_active: z.boolean(),
});

export const visitpadChronicIllnessEditFormSchema = z.object({
  icd10_code: z.string().min(1).max(16),
  display_name: z.string().min(1).max(512),
  category: z.enum([
    'cardiovascular',
    'respiratory',
    'metabolic',
    'renal',
    'neurological',
    'other',
  ]),
  snomed_code: z.string().max(64).nullable().optional(),
  display_order: z.coerce.number().int(),
  is_active: z.boolean(),
});

export const visitpadProcedureEditFormSchema = z.object({
  cpt_code: z.string().min(1).max(16),
  display_name: z.string().min(1).max(512),
  official_descriptor: z.string().min(1).max(512),
  category: z.enum(['diagnostic', 'therapeutic', 'surgical', 'ancillary', 'other']),
  billing_category: z.enum(['professional', 'facility', 'ancillary', 'bundled', 'other']),
  duration_minutes: z.coerce.number().int().min(0).max(1440),
  requires_consent: z.boolean(),
  snomed_code: z.string().max(64).nullable().optional(),
  type_modality: z.string().max(128).nullable().optional(),
  display_order: z.coerce.number().int(),
  is_active: z.boolean(),
});

export type VisitpadUnitCreateSchema = z.infer<typeof visitpadUnitCreateSchema>;
export type VisitpadUnitEditFormSchema = z.infer<typeof visitpadUnitEditFormSchema>;
export type VisitpadUnitConversionCreateSchema = z.infer<typeof visitpadUnitConversionCreateSchema>;
export type VisitpadUnitConversionEditFormSchema = z.infer<typeof visitpadUnitConversionEditFormSchema>;
export type VisitpadAllergyReactionEditFormSchema = z.infer<typeof visitpadAllergyReactionEditFormSchema>;
export type VisitpadChiefComplaintEditFormSchema = z.infer<typeof visitpadChiefComplaintEditFormSchema>;
export type VisitpadDiagnosisEditFormSchema = z.infer<typeof visitpadDiagnosisEditFormSchema>;
export type VisitpadAllergenEditFormSchema = z.infer<typeof visitpadAllergenEditFormSchema>;
export type VisitpadRxColumnEditFormSchema = z.infer<typeof visitpadRxColumnEditFormSchema>;
export type VisitpadMedicineEditCoreSchema = z.infer<typeof visitpadMedicineEditCoreSchema>;
export type VisitpadChronicIllnessEditFormSchema = z.infer<typeof visitpadChronicIllnessEditFormSchema>;
export type VisitpadProcedureEditFormSchema = z.infer<typeof visitpadProcedureEditFormSchema>;
export type VisitpadVitalEditFormSchema = z.infer<typeof visitpadVitalEditFormSchema>;
