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
  display_name: z.string().min(1).max(256),
  dimension: visitpadUnitDimensionSchema,
  ucum_code: z.string().max(64).nullable().optional(),
  is_canonical: z.boolean().optional(),
  display_order: z.coerce.number().int().optional(),
  is_active: z.boolean().optional(),
});

export const visitpadUnitUpdateSchema = z
  .object({
    display_name: z.string().min(1).max(256).nullable().optional(),
    dimension: visitpadUnitDimensionSchema.nullable().optional(),
    ucum_code: z.string().max(64).nullable().optional(),
    is_canonical: z.boolean().nullable().optional(),
    display_order: z.coerce.number().int().nullable().optional(),
    is_active: z.boolean().nullable().optional(),
  })
  .strict();

/** Edit form (all fields shown in dialog — maps to `VisitpadUnitUpdate` on save). */
export const visitpadUnitEditFormSchema = z.object({
  display_name: z.string().min(1).max(256),
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

export const visitpadVitalCreateSchema = z
  .object({
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
  })
  .superRefine((data, ctx) => {
    if (data.is_paired) {
      const p = data.pair_code?.trim();
      if (!p) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Partner vital code is required when paired capture is on.',
          path: ['pair_code'],
        });
      }
    }
  });

/** Legacy Integrator medicine code: 3–8 letters, digits, underscore; immutable after create in HIMS. */
const MEDICINE_CODE_REGEX = /^[A-Za-z0-9_]{3,8}$/;

const visitpadMedicineScheduleFormEnum = z.enum(['otc', 'h', 'h1', 's', 'x', 'unscheduled']);

function optionalFiniteNumberString(fieldLabel: string) {
  return z
    .string()
    .optional()
    .transform((s) => {
      if (s === undefined || s === null) return null as number | null;
      const t = String(s).trim();
      if (!t) return null as number | null;
      const n = Number(t);
      return Number.isFinite(n) ? n : Number.NaN;
    })
    .refine((n) => n === null || !Number.isNaN(n), { message: `${fieldLabel} must be empty or a valid number` });
}

function optionalIntString(fieldLabel: string) {
  return z
    .string()
    .optional()
    .transform((s) => {
      if (s === undefined || s === null) return null as number | null;
      const t = String(s).trim();
      if (!t) return null as number | null;
      const n = parseInt(t, 10);
      return Number.isFinite(n) ? n : Number.NaN;
    })
    .refine((n) => n === null || !Number.isNaN(n), { message: `${fieldLabel} must be empty or a whole number` });
}

export const visitpadMedicineCreateFormSchema = z.object({
  code: z
    .string()
    .trim()
    .min(3)
    .max(8)
    .regex(MEDICINE_CODE_REGEX, 'Use 3–8 letters, digits, or underscores.'),
  generic_name: z.string().trim().min(1).max(512),
  display_name: z.string().trim().min(1).max(512),
  short_name: z.string().max(256).optional(),
  drug_class: z.string().trim().min(1).max(256),
  drug_subclass: z.string().max(256).optional(),
  brand_names_csv: z.string().optional(),
  snomed_substance_code: z.string().max(64).optional(),
  snomed_product_code: z.string().max(64).optional(),
  display_order: z.coerce.number().int(),
  dosage_form: z.string().trim().min(1).max(128),
  routes_csv: z.string().optional(),
  strength_value: optionalFiniteNumberString('Strength value'),
  strength_unit: z.string().max(32).optional(),
  strength_display: z.string().max(256).optional(),
  concentration_value: optionalFiniteNumberString('Concentration value'),
  concentration_unit: z.string().max(32).optional(),
  volume_per_unit: optionalFiniteNumberString('Volume per unit (ml)'),
  schedule: visitpadMedicineScheduleFormEnum,
  requires_prescription: z.boolean(),
  is_controlled_substance: z.boolean(),
  is_narcotic: z.boolean(),
  is_restricted_antibiotic: z.boolean(),
  allergen_classes_csv: z.string().optional(),
  contraindications_csv: z.string().optional(),
  pregnancy_category: z.enum(['not_set', 'a', 'b', 'c', 'd', 'x']),
  lactation_safety: z.enum(['not_set', 'compatible', 'caution', 'avoid']),
  pediatric_use: z.enum(['not_set', 'approved', 'caution', 'avoid']),
  max_dose_per_day_value: optionalFiniteNumberString('Max dose / day value'),
  max_dose_per_day_unit: z.string().max(32).optional(),
  black_box_warning: z.boolean(),
  default_dose_value: optionalFiniteNumberString('Default dose value'),
  default_dose_unit: z.string().max(32).optional(),
  default_frequency: z.string().max(64).optional(),
  default_duration_days: optionalIntString('Default duration (days)'),
  default_route: z.string().max(64).optional(),
  typical_quantity: optionalFiniteNumberString('Typical quantity'),
  default_instructions: z.string().max(1024).optional(),
  notes: z.string().max(2048).optional(),
  is_active: z.boolean(),
});

export const visitpadMedicineEditFormSchema = visitpadMedicineCreateFormSchema.omit({ code: true });

export type VisitpadMedicineCreateFormInput = z.input<typeof visitpadMedicineCreateFormSchema>;
export type VisitpadMedicineEditFormInput = z.input<typeof visitpadMedicineEditFormSchema>;

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

const CHIEF_COMPLAINT_BODY_SYSTEMS = [
  'cardiovascular',
  'respiratory',
  'neurological',
  'gastrointestinal',
  'musculoskeletal',
  'genitourinary',
  'dermatological',
  'ophthalmological',
  'endocrine',
  'ent',
  'skin',
  'psychiatric',
  'general',
  'other',
] as const;

const CHIEF_COMPLAINT_TRIAGE_PRIORITIES = [
  'emergency',
  'urgent',
  'semi_urgent',
  'non_urgent',
  'routine',
] as const;

export const visitpadChiefComplaintBodySystemSchema = z.enum(CHIEF_COMPLAINT_BODY_SYSTEMS);
export const visitpadChiefComplaintTriagePrioritySchema = z.enum(CHIEF_COMPLAINT_TRIAGE_PRIORITIES);

export const visitpadChiefComplaintCreateFormSchema = z.object({
  code: z.string().min(1).max(64),
  display_name: z.string().min(1).max(256),
  short_name: z.string().max(120).optional(),
  body_system: visitpadChiefComplaintBodySystemSchema,
  triage_priority: visitpadChiefComplaintTriagePrioritySchema,
  synonyms_text: z.string().max(8000).optional(),
  is_paediatric_relevant: z.boolean(),
  display_order: z.coerce.number().int(),
  is_active: z.boolean(),
  snomed_code: z.string().max(64).optional().nullable(),
});

export type VisitpadChiefComplaintCreateFormSchema = z.infer<typeof visitpadChiefComplaintCreateFormSchema>;

export const visitpadChiefComplaintEditFormSchema = z.object({
  code: z.string().min(1).max(64),
  display_name: z.string().min(1).max(256),
  short_name: z.string().max(120).optional(),
  body_system: visitpadChiefComplaintBodySystemSchema,
  triage_priority: visitpadChiefComplaintTriagePrioritySchema,
  snomed_code: z.string().max(64).nullable().optional(),
  is_paediatric_relevant: z.boolean(),
  display_order: z.coerce.number().int(),
  is_active: z.boolean(),
  /** One synonym per line (max 50 non-empty lines). */
  synonyms_text: z.string().max(8000).optional(),
});

const DIAGNOSIS_CODE_PATTERN = /^[A-Za-z0-9_]{3,12}$/;

const visitpadDiagnosisIcdCategorySchema = z.enum([
  'general',
  'infectious',
  'neoplastic',
  'metabolic',
  'psychiatric',
  'injury',
  'other',
]);

export const visitpadDiagnosisCreateFormSchema = z
  .object({
    code: z
      .string()
      .min(3)
      .max(12)
      .regex(DIAGNOSIS_CODE_PATTERN, 'Use 3–12 letters, digits, or underscore only.'),
    display_name: z.string().min(1).max(512),
    short_name: z.string().max(120).optional(),
    snomed_code: z.string().max(64).optional().nullable(),
    is_chronic_flag: z.boolean(),
    is_notifiable: z.boolean(),
    display_order: z.coerce.number().int(),
    is_active: z.boolean(),
    icd10_code: z.string().max(16).optional(),
    icd_version: z.enum(['ICD-10', 'ICD-11']).optional(),
    official_descriptor: z.string().max(512).optional(),
    category: visitpadDiagnosisIcdCategorySchema.optional(),
  })
  .superRefine((data, ctx) => {
    const hasIcd =
      (data.icd10_code?.trim() ?? '') !== '' ||
      data.icd_version != null ||
      (data.official_descriptor?.trim() ?? '') !== '' ||
      data.category != null;
    const completeIcd =
      (data.icd10_code?.trim() ?? '') !== '' &&
      data.icd_version != null &&
      (data.official_descriptor?.trim() ?? '') !== '' &&
      data.category != null;
    if (hasIcd && !completeIcd) {
      ctx.addIssue({
        code: 'custom',
        message: 'ICD enrichment needs ICD-10 code, version, official descriptor, and category together.',
        path: ['icd10_code'],
      });
    }
  });

export type VisitpadDiagnosisCreateFormSchema = z.infer<typeof visitpadDiagnosisCreateFormSchema>;

export const visitpadDiagnosisEditFormSchema = z
  .object({
    display_name: z.string().min(1).max(512),
    short_name: z.string().max(120).optional().nullable(),
    icd10_code: z.string().max(16).optional(),
    icd_version: z.enum(['ICD-10', 'ICD-11']).nullable().optional(),
    official_descriptor: z.string().max(512).optional(),
    category: visitpadDiagnosisIcdCategorySchema.nullable().optional(),
    is_chronic_flag: z.boolean(),
    is_notifiable: z.boolean(),
    snomed_code: z.string().max(64).nullable().optional(),
    display_order: z.coerce.number().int(),
    is_active: z.boolean(),
  })
  .superRefine((data, ctx) => {
    const hasIcd =
      (data.icd10_code?.trim() ?? '') !== '' ||
      data.icd_version != null ||
      (data.official_descriptor?.trim() ?? '') !== '' ||
      data.category != null;
    const completeIcd =
      (data.icd10_code?.trim() ?? '') !== '' &&
      data.icd_version != null &&
      (data.official_descriptor?.trim() ?? '') !== '' &&
      data.category != null;
    const allExplicitlyClear =
      (data.icd10_code?.trim() ?? '') === '' &&
      data.icd_version == null &&
      (data.official_descriptor?.trim() ?? '') === '' &&
      data.category == null;
    if (hasIcd && !completeIcd && !allExplicitlyClear) {
      ctx.addIssue({
        code: 'custom',
        message: 'Set all ICD fields together, or clear all of them.',
        path: ['icd10_code'],
      });
    }
  });

const ALLERGEN_CODE_PATTERN = /^[A-Za-z0-9_]{3,8}$/;

export const visitpadAllergenCreateFormSchema = z.object({
  code: z
    .string()
    .min(3)
    .max(8)
    .regex(ALLERGEN_CODE_PATTERN, 'Use 3–8 letters, digits, or underscore only.'),
  display_name: z.string().min(1).max(256),
  allergen_type: z
    .enum(['__none__', 'drug', 'food', 'environmental', 'other'])
    .refine((v) => v !== '__none__', { message: 'Select allergen type.', path: ['allergen_type'] }),
  reaction_severity_default: z.enum(['mild', 'moderate', 'severe', 'unknown']),
  snomed_code: z.string().max(64).optional().nullable(),
  is_active: z.boolean(),
});

export type VisitpadAllergenCreateFormSchema = z.infer<typeof visitpadAllergenCreateFormSchema>;

export const visitpadAllergenEditFormSchema = z.object({
  display_name: z.string().min(1).max(256),
  allergen_type: z.enum(['drug', 'food', 'environmental', 'other']),
  drug_class: z.string().max(256).nullable().optional(),
  reaction_severity_default: z.enum(['mild', 'moderate', 'severe', 'unknown']),
  snomed_code: z.string().max(64).nullable().optional(),
  display_order: z.coerce.number().int(),
  is_active: z.boolean(),
});

const ALLERGY_REACTION_CODE_PATTERN = /^[A-Za-z0-9_]{3,8}$/;

export const visitpadAllergyReactionCreateFormSchema = z.object({
  code: z
    .string()
    .min(3)
    .max(8)
    .regex(ALLERGY_REACTION_CODE_PATTERN, 'Use 3–8 letters, digits, or underscore only.'),
  display_name: z.string().min(1).max(256),
  short_name: z.string().max(120).optional(),
  snomed_code: z.string().max(64).optional().nullable(),
  is_active: z.boolean(),
});

export type VisitpadAllergyReactionCreateFormSchema = z.infer<typeof visitpadAllergyReactionCreateFormSchema>;

export const visitpadAllergyReactionEditFormSchema = z.object({
  display_name: z.string().min(1).max(256),
  short_name: z.string().max(120).optional(),
  snomed_code: z.string().max(64).optional(),
  display_order: z.coerce.number().int(),
  is_active: z.boolean(),
});

/** Matches backend `VisitpadRxColumnCreate.code` (2–8, letters, digits, underscore). */
const RX_COLUMN_CODE_REGEX = /^[A-Za-z0-9_]{2,8}$/;

export const visitpadRxColumnCreateFormSchema = z.object({
  display_name: z.string().trim().min(1).max(256),
  code: z
    .string()
    .trim()
    .min(2)
    .max(8)
    .regex(RX_COLUMN_CODE_REGEX, 'Use 2–8 letters, digits, or underscores.'),
  is_active: z.boolean(),
});

export const visitpadRxColumnEditFormSchema = z.object({
  display_name: z.string().trim().min(1).max(256),
  extra_unit: z.string().max(128).nullable().optional(),
  display_order: z.coerce.number().int(),
  is_active: z.boolean(),
});

const CHRONIC_ILLNESS_CODE_REGEX = /^[A-Za-z0-9_]{3,8}$/;

const visitpadChronicIllnessCategorySchema = z.enum([
  'autoimmune',
  'endocrine',
  'cardiovascular',
  'metabolic',
  'neurological',
  'renal',
  'respiratory',
  'other',
]);

export const visitpadChronicIllnessCreateFormSchema = z.object({
  icd10_code: z
    .string()
    .trim()
    .min(3)
    .max(8)
    .regex(CHRONIC_ILLNESS_CODE_REGEX, 'Use 3–8 letters, digits, or underscores.'),
  display_name: z.string().trim().min(1).max(512),
  category: visitpadChronicIllnessCategorySchema,
  snomed_code: z.string().max(64).nullable().optional(),
  chronic_illness_prompt: z.boolean(),
  is_active: z.boolean(),
});

export const visitpadChronicIllnessEditFormSchema = z.object({
  display_name: z.string().trim().min(1).max(512),
  category: visitpadChronicIllnessCategorySchema,
  snomed_code: z.string().max(64).nullable().optional(),
  chronic_illness_prompt: z.boolean(),
  is_active: z.boolean(),
});

const PROCEDURE_CODE_REGEX = /^[A-Za-z0-9_]{3,8}$/;

const visitpadProcedureCategorySchema = z.enum([
  'diagnostic',
  'therapeutic',
  'surgical',
  'ancillary',
  'other',
]);

const visitpadProcedureBillingCategorySchema = z.enum([
  'professional',
  'facility',
  'ancillary',
  'bundled',
  'other',
]);

export const visitpadProcedureCreateFormSchema = z.object({
  cpt_code: z
    .string()
    .trim()
    .min(3)
    .max(8)
    .regex(PROCEDURE_CODE_REGEX, 'Use 3–8 letters, digits, or underscores.'),
  short_name: z.string().max(64),
  display_name: z.string().trim().min(1).max(512),
  category: visitpadProcedureCategorySchema,
  billing_category: visitpadProcedureBillingCategorySchema,
  duration_minutes: z.coerce.number().int().min(0).max(1440),
  requires_consent: z.boolean(),
  type_modality: z.string().max(128).nullable().optional(),
  snomed_code: z.string().max(64).nullable().optional(),
  is_active: z.boolean(),
});

export const visitpadProcedureEditFormSchema = z.object({
  short_name: z.string().max(64),
  display_name: z.string().min(1).max(512),
  official_descriptor: z.string().min(1).max(512),
  category: visitpadProcedureCategorySchema,
  billing_category: visitpadProcedureBillingCategorySchema,
  duration_minutes: z.coerce.number().int().min(0).max(1440),
  requires_consent: z.boolean(),
  snomed_code: z.string().max(64).nullable().optional(),
  type_modality: z.string().max(128).nullable().optional(),
  is_active: z.boolean(),
});

export type VisitpadUnitCreateSchema = z.infer<typeof visitpadUnitCreateSchema>;
export type VisitpadUnitEditFormSchema = z.infer<typeof visitpadUnitEditFormSchema>;
export type VisitpadUnitConversionCreateSchema = z.infer<typeof visitpadUnitConversionCreateSchema>;
export type VisitpadUnitConversionEditFormSchema = z.infer<typeof visitpadUnitConversionEditFormSchema>;
export type VisitpadAllergyReactionEditFormSchema = z.infer<typeof visitpadAllergyReactionEditFormSchema>;
export type VisitpadRxColumnCreateFormSchema = z.infer<typeof visitpadRxColumnCreateFormSchema>;
export type VisitpadChiefComplaintEditFormSchema = z.infer<typeof visitpadChiefComplaintEditFormSchema>;
export type VisitpadDiagnosisEditFormSchema = z.infer<typeof visitpadDiagnosisEditFormSchema>;
export type VisitpadAllergenEditFormSchema = z.infer<typeof visitpadAllergenEditFormSchema>;
export type VisitpadRxColumnEditFormSchema = z.infer<typeof visitpadRxColumnEditFormSchema>;
export type VisitpadMedicineCreateFormSchema = z.infer<typeof visitpadMedicineCreateFormSchema>;
export type VisitpadMedicineEditFormSchema = z.infer<typeof visitpadMedicineEditFormSchema>;
export type VisitpadChronicIllnessCreateFormSchema = z.infer<typeof visitpadChronicIllnessCreateFormSchema>;
export type VisitpadChronicIllnessCreateFormInput = z.input<typeof visitpadChronicIllnessCreateFormSchema>;
export type VisitpadChronicIllnessEditFormSchema = z.infer<typeof visitpadChronicIllnessEditFormSchema>;
export type VisitpadChronicIllnessEditFormInput = z.input<typeof visitpadChronicIllnessEditFormSchema>;
export type VisitpadProcedureCreateFormSchema = z.infer<typeof visitpadProcedureCreateFormSchema>;
export type VisitpadProcedureCreateFormInput = z.input<typeof visitpadProcedureCreateFormSchema>;
export type VisitpadProcedureEditFormSchema = z.infer<typeof visitpadProcedureEditFormSchema>;
export type VisitpadProcedureEditFormInput = z.input<typeof visitpadProcedureEditFormSchema>;
export type VisitpadVitalEditFormSchema = z.infer<typeof visitpadVitalEditFormSchema>;
