import { z } from 'zod';

function visitpadTrimLower(code: string): string {
  return code.trim().toLowerCase();
}

/** Unified Visitpad catalog code: 3–9 alnum + underscore. */
export const VISITPAD_CATALOG_CODE_REGEX = /^\w{3,9}$/;

export const visitpadCatalogCodeSchema = z
  .string()
  .trim()
  .min(3)
  .max(9)
  .regex(
    VISITPAD_CATALOG_CODE_REGEX,
    'Code must be 3–9 characters: letters, digits, or underscores only.',
  );

export const visitpadCatalogCodeLowerSchema = visitpadCatalogCodeSchema.transform(visitpadTrimLower);

/** Rx column codes: 2–64 alnum + underscore (platform seed may use 2-char codes). */
export const VISITPAD_RX_COLUMN_CODE_REGEX = /^\w{2,64}$/;

export const visitpadRxColumnCodeSchema = z
  .string()
  .trim()
  .min(2)
  .max(64)
  .regex(
    VISITPAD_RX_COLUMN_CODE_REGEX,
    'Code must be 2–64 characters: letters, digits, or underscores only.',
  );

/** Vital codes: 1–64 alnum + underscore (OPD integration slugs). */
export const VISITPAD_VITAL_CODE_REGEX = /^\w{1,64}$/;

export const visitpadVitalCodeSchema = z
  .string()
  .trim()
  .min(1)
  .max(64)
  .regex(
    VISITPAD_VITAL_CODE_REGEX,
    'Code must be 1–64 characters: letters, digits, or underscores only.',
  );

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
  code: visitpadCatalogCodeLowerSchema,
  display_name: z.string().min(1).max(256),
  dimension: visitpadUnitDimensionSchema.optional().default('other'),
  ucum_code: z.string().max(64).nullable().optional(),
  is_canonical: z.boolean().optional(),
  display_order: z.coerce.number().int(),
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
  dimension: visitpadUnitDimensionSchema.optional().default('other'),
  display_order: z.coerce.number().int(),
  is_active: z.boolean(),
});

export const visitpadUnitConversionCreateSchema = z
  .object({
    from_unit_code: z.string().min(1).max(64).transform(visitpadTrimLower),
    to_unit_code: z.string().min(1).max(64).transform(visitpadTrimLower),
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
    from_unit_code: z.string().min(1).max(64).transform(visitpadTrimLower),
    to_unit_code: z.string().min(1).max(64).transform(visitpadTrimLower),
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
    code: visitpadVitalCodeSchema,
    name: z.string().max(256).optional(),
    short_name: z.string().max(64).optional(),
    category: visitpadVitalCategorySchema.optional(),
    data_type: visitpadVitalDataTypeSchema.optional(),
    unit: z.string().max(128).optional(),
    default_unit_code: z.string().max(64).optional(),
    reference_kind: visitpadVitalReferenceKindSchema.optional(),
    input_method: visitpadVitalInputMethodSchema.optional(),
    allowed_units: z.array(z.string()).optional(),
    reference_json: z.record(z.unknown()).optional(),
    normal_range_adult: z.record(z.unknown()).optional(),
    normal_range_paediatric: z.record(z.unknown()).optional(),
    is_paired: z.boolean().optional(),
    pair_code: z.string().max(64).nullable().optional(),
    critical_low: z.number().nullable().optional(),
    critical_high: z.number().nullable().optional(),
    display_order: z.coerce.number().int(),
    is_active: z.boolean().optional(),
    loinc_code: z.string().max(32).nullable().optional(),
    snomed_observable_code: z.string().max(64).nullable().optional(),
  })
  .transform((data) => {
    const code = data.code.trim();
    const name = (data.name?.trim() ?? '') || code;
    const short = (data.short_name?.trim() ?? '') || name.slice(0, 64);
    return {
      ...data,
      code,
      name,
      short_name: short,
      category: data.category ?? 'vital_signs',
      data_type: data.data_type ?? 'numeric',
      unit: (data.unit?.trim() ?? '') || '—',
      default_unit_code: (data.default_unit_code?.trim() ?? '') || code,
      reference_kind: data.reference_kind ?? 'none',
      input_method: data.input_method ?? 'manual',
      reference_json: data.reference_json ?? {},
      normal_range_adult: data.normal_range_adult ?? {},
      normal_range_paediatric: data.normal_range_paediatric ?? {},
    };
  })
  .superRefine((data, ctx) => {
    if (data.is_paired) {
      const p = data.pair_code?.trim();
      if (!p) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Partner vital is required when paired capture is on.',
          path: ['pair_code'],
        });
      }
    }
  });

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
    .refine((n) => n === null || !Number.isNaN(n), {
      message: `${fieldLabel} must be empty or a valid number`,
    });
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
    .refine((n) => n === null || !Number.isNaN(n), {
      message: `${fieldLabel} must be empty or a whole number`,
    });
}

export const visitpadMedicineCreateFormSchema = z.object({
  code: visitpadCatalogCodeSchema,
  generic_name: z.string().trim().max(512).optional(),
  display_name: z.string().trim().min(1).max(512),
  short_name: z.string().max(256).optional(),
  drug_class: z.string().trim().max(256).optional(),
  drug_subclass: z.string().max(256).optional(),
  brand_names_csv: z.string().optional(),
  snomed_substance_code: z.string().max(64).optional(),
  snomed_product_code: z.string().max(64).optional(),
  display_order: z.coerce.number().int(),
  dosage_form: z.string().trim().max(128).optional(),
  routes_csv: z.string().optional(),
  strength_value: optionalFiniteNumberString('Strength value'),
  strength_unit: z.string().max(32).optional(),
  strength_display: z.string().max(256).optional(),
  concentration_value: optionalFiniteNumberString('Concentration value'),
  concentration_unit: z.string().max(32).optional(),
  volume_per_unit: optionalFiniteNumberString('Volume per unit (ml)'),
  schedule: visitpadMedicineScheduleFormEnum.optional(),
  requires_prescription: z.boolean().optional().default(false),
  is_controlled_substance: z.boolean().optional().default(false),
  is_narcotic: z.boolean().optional().default(false),
  is_restricted_antibiotic: z.boolean().optional().default(false),
  allergen_classes_csv: z.string().optional(),
  contraindications_csv: z.string().optional(),
  pregnancy_category: z.enum(['not_set', 'a', 'b', 'c', 'd', 'x']).optional(),
  lactation_safety: z.enum(['not_set', 'compatible', 'caution', 'avoid']).optional(),
  pediatric_use: z.enum(['not_set', 'approved', 'caution', 'avoid']).optional(),
  max_dose_per_day_value: optionalFiniteNumberString('Max dose / day value'),
  max_dose_per_day_unit: z.string().max(32).optional(),
  black_box_warning: z.boolean().optional().default(false),
  black_box_warning_text: z.string().max(2048).optional(),
  default_dose_value: optionalFiniteNumberString('Default dose value'),
  default_dose_unit: z.string().max(32).optional(),
  default_frequency: z.string().max(64).optional(),
  default_duration_days: optionalIntString('Default duration (days)'),
  default_route: z.string().max(64).optional(),
  typical_quantity: optionalFiniteNumberString('Typical quantity'),
  price: optionalFiniteNumberString('Price').refine(
    (n) => n === null || n === undefined || n >= 0,
    { message: 'Price must be empty or zero or greater' },
  ),
  default_instructions: z.string().max(1024).optional(),
  notes: z.string().max(2048).optional(),
  is_active: z.boolean().optional().default(true),
});

export const visitpadMedicineEditFormSchema = visitpadMedicineCreateFormSchema.omit({ code: true });

export type VisitpadMedicineCreateFormInput = z.input<typeof visitpadMedicineCreateFormSchema>;
export type VisitpadMedicineEditFormInput = z.input<typeof visitpadMedicineEditFormSchema>;

const finiteNumberOrNull = z.custom<number | null>(
  (v) => v === null || (typeof v === 'number' && v === v),
  { message: 'Must be a finite number or empty' },
);

export const visitpadVitalEditFormSchema = z
  .object({
    name: z.string().max(256).optional(),
    short_name: z.string().max(64).optional(),
    category: visitpadVitalCategorySchema.optional(),
    data_type: visitpadVitalDataTypeSchema.optional(),
    unit: z.string().max(128).optional(),
    default_unit_code: z.string().max(64).optional(),
    input_method: visitpadVitalInputMethodSchema.optional(),
    is_paired: z.boolean(),
    pair_code: z.string().max(64).nullable().optional(),
    critical_low: finiteNumberOrNull.optional(),
    critical_high: finiteNumberOrNull.optional(),
    display_order: z.coerce.number().int(),
    is_active: z.boolean(),
    snomed_observable_code: z.string().max(64).nullable().optional(),
  })
  .superRefine((data, ctx) => {
    if (data.is_paired) {
      const p = data.pair_code?.trim();
      if (!p) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Partner vital is required when paired capture is on.',
          path: ['pair_code'],
        });
      }
    }
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
  code: visitpadCatalogCodeSchema,
  display_name: z.string().min(1).max(256),
  short_name: z.string().max(120).optional(),
  body_system: visitpadChiefComplaintBodySystemSchema.optional().default('general'),
  triage_priority: visitpadChiefComplaintTriagePrioritySchema.optional().default('routine'),
  synonyms_text: z.string().max(8000).optional(),
  is_paediatric_relevant: z.boolean().optional().default(false),
  display_order: z.coerce.number().int(),
  is_active: z.boolean().optional().default(true),
  snomed_code: z.string().max(64).optional().nullable(),
});

export type VisitpadChiefComplaintCreateFormSchema = z.infer<
  typeof visitpadChiefComplaintCreateFormSchema
>;

export const visitpadChiefComplaintEditFormSchema = z.object({
  code: visitpadCatalogCodeSchema,
  display_name: z.string().min(1).max(256),
  short_name: z.string().max(120).optional(),
  body_system: visitpadChiefComplaintBodySystemSchema.optional().default('general'),
  triage_priority: visitpadChiefComplaintTriagePrioritySchema.optional().default('routine'),
  snomed_code: z.string().max(64).nullable().optional(),
  is_paediatric_relevant: z.boolean().optional().default(false),
  display_order: z.coerce.number().int(),
  is_active: z.boolean(),
  /** One synonym per line (max 50 non-empty lines). */
  synonyms_text: z.string().max(8000).optional(),
});

export const visitpadDiagnosisCreateFormSchema = z.object({
  code: visitpadCatalogCodeSchema,
  display_name: z.string().min(1).max(512),
  short_name: z.string().max(120).optional(),
  snomed_code: z.string().max(64).optional().nullable(),
  is_chronic_flag: z.boolean().optional().default(false),
  is_notifiable: z.boolean().optional().default(false),
  display_order: z.coerce.number().int(),
  is_active: z.boolean().optional().default(true),
});

export type VisitpadDiagnosisCreateFormSchema = z.infer<typeof visitpadDiagnosisCreateFormSchema>;

export const visitpadDiagnosisEditFormSchema = z.object({
  display_name: z.string().min(1).max(512),
  short_name: z.string().max(120).optional().nullable(),
  is_chronic_flag: z.boolean(),
  is_notifiable: z.boolean(),
  snomed_code: z.string().max(64).nullable().optional(),
  display_order: z.coerce.number().int(),
  is_active: z.boolean(),
});

export const visitpadAllergenCreateFormSchema = z.object({
  code: visitpadCatalogCodeSchema,
  display_name: z.string().min(1).max(256),
  allergen_type: z
    .enum(['__none__', 'drug', 'food', 'environmental', 'other'])
    .optional()
    .default('other')
    .transform((v) => (v === '__none__' ? 'other' : v)),
  reaction_severity_default: z
    .enum(['__unset__', 'mild', 'moderate', 'severe', 'unknown'])
    .optional()
    .transform((v) => (!v || v === '__unset__' ? 'unknown' : v)),
  snomed_code: z.string().max(64).optional().nullable(),
  display_order: z.coerce.number().int(),
  is_active: z.boolean().optional().default(true),
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

export const visitpadAllergyReactionCreateFormSchema = z.object({
  code: visitpadCatalogCodeSchema,
  display_name: z.string().min(1).max(256),
  short_name: z.string().max(120).optional(),
  snomed_code: z.string().max(64).optional().nullable(),
  display_order: z.coerce.number().int(),
  is_active: z.boolean().optional().default(true),
});

export type VisitpadAllergyReactionCreateFormSchema = z.infer<
  typeof visitpadAllergyReactionCreateFormSchema
>;

export const visitpadAllergyReactionEditFormSchema = z.object({
  display_name: z.string().min(1).max(256),
  short_name: z.string().max(120).optional(),
  snomed_code: z.string().max(64).optional(),
  display_order: z.coerce.number().int(),
  is_active: z.boolean(),
});

export const visitpadRxColumnCreateFormSchema = z.object({
  display_name: z.string().trim().min(1).max(256),
  code: visitpadRxColumnCodeSchema,
  extra_unit: z.string().max(128).optional(),
  display_order: z.coerce.number().int(),
  is_active: z.boolean().optional().default(true),
});

export const visitpadRxColumnEditFormSchema = z.object({
  display_name: z.string().trim().min(1).max(256),
  extra_unit: z.string().max(128).nullable().optional(),
  display_order: z.coerce.number().int(),
  is_active: z.boolean(),
});

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
  icd10_code: visitpadCatalogCodeSchema,
  display_name: z.string().trim().min(1).max(512),
  category: visitpadChronicIllnessCategorySchema.optional().default('other'),
  snomed_code: z.string().max(64).nullable().optional(),
  chronic_illness_prompt: z.boolean().optional().default(false),
  display_order: z.coerce.number().int(),
  is_active: z.boolean().optional().default(true),
});

export const visitpadChronicIllnessEditFormSchema = z.object({
  display_name: z.string().trim().min(1).max(512),
  category: visitpadChronicIllnessCategorySchema.optional().default('other'),
  snomed_code: z.string().max(64).nullable().optional(),
  chronic_illness_prompt: z.boolean().optional().default(false),
  display_order: z.coerce.number().int(),
  is_active: z.boolean(),
});

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

/** Empty or NaN duration → omitted; API defaults to 0 on create. */
const visitpadOptionalDurationMinutesSchema = z.preprocess(
  (val) => {
    if (val === '' || val === undefined || val === null) return undefined;
    if (typeof val === 'number' && Number.isNaN(val)) return undefined;
    return val;
  },
  z.coerce.number().int().min(0).max(1440).optional().default(0),
);

export const visitpadProcedureCreateFormSchema = z.object({
  cpt_code: visitpadCatalogCodeSchema,
  short_name: z.string().max(64).optional(),
  official_descriptor: z.string().trim().max(512).optional(),
  display_name: z.string().trim().min(1).max(512),
  category: visitpadProcedureCategorySchema.optional().default('other'),
  billing_category: visitpadProcedureBillingCategorySchema.optional().default('other'),
  duration_minutes: visitpadOptionalDurationMinutesSchema,
  requires_consent: z.boolean().optional().default(false),
  type_modality: z.string().max(128).nullable().optional(),
  snomed_code: z.string().max(64).nullable().optional(),
  display_order: z.coerce.number().int(),
  is_active: z.boolean().optional().default(true),
});

export const visitpadProcedureEditFormSchema = z.object({
  short_name: z.string().max(64).optional(),
  display_name: z.string().min(1).max(512),
  official_descriptor: z.string().max(512).optional(),
  category: visitpadProcedureCategorySchema.optional().default('other'),
  billing_category: visitpadProcedureBillingCategorySchema.optional().default('other'),
  duration_minutes: visitpadOptionalDurationMinutesSchema,
  requires_consent: z.boolean().optional().default(false),
  snomed_code: z.string().max(64).nullable().optional(),
  type_modality: z.string().max(128).nullable().optional(),
  display_order: z.coerce.number().int(),
  is_active: z.boolean(),
});

export const visitpadVaccineCreateFormSchema = z.object({
  code: visitpadCatalogCodeLowerSchema,
  display_name: z.string().trim().min(1).max(512),
  short_name: z.string().max(120).optional(),
  display_order: z.coerce.number().int(),
  is_active: z.boolean().optional().default(true),
});

export const visitpadVaccineEditFormSchema = z.object({
  display_name: z.string().trim().min(1).max(512),
  short_name: z.string().max(120).optional(),
  display_order: z.coerce.number().int(),
  is_active: z.boolean(),
});

export const visitpadManufacturerCreateFormSchema = z.object({
  code: visitpadCatalogCodeLowerSchema,
  display_name: z.string().trim().min(1).max(512),
  short_name: z.union([z.string().max(120), z.literal('')]).optional(),
  display_order: z.coerce.number().int(),
  is_active: z.boolean().optional().default(true),
});

export const visitpadManufacturerEditFormSchema = z.object({
  display_name: z.string().trim().min(1).max(512),
  short_name: z.union([z.string().max(120), z.literal('')]).optional(),
  display_order: z.coerce.number().int(),
  is_active: z.boolean(),
});

export type VisitpadUnitCreateSchema = z.infer<typeof visitpadUnitCreateSchema>;
export type VisitpadUnitEditFormSchema = z.infer<typeof visitpadUnitEditFormSchema>;
export type VisitpadUnitConversionCreateSchema = z.infer<typeof visitpadUnitConversionCreateSchema>;
export type VisitpadUnitConversionEditFormSchema = z.infer<
  typeof visitpadUnitConversionEditFormSchema
>;
export type VisitpadAllergyReactionEditFormSchema = z.infer<
  typeof visitpadAllergyReactionEditFormSchema
>;
export type VisitpadRxColumnCreateFormSchema = z.infer<typeof visitpadRxColumnCreateFormSchema>;
export type VisitpadChiefComplaintEditFormSchema = z.infer<
  typeof visitpadChiefComplaintEditFormSchema
>;
export type VisitpadDiagnosisEditFormSchema = z.infer<typeof visitpadDiagnosisEditFormSchema>;
export type VisitpadAllergenEditFormSchema = z.infer<typeof visitpadAllergenEditFormSchema>;
export type VisitpadRxColumnEditFormSchema = z.infer<typeof visitpadRxColumnEditFormSchema>;
export type VisitpadMedicineCreateFormSchema = z.infer<typeof visitpadMedicineCreateFormSchema>;
export type VisitpadMedicineEditFormSchema = z.infer<typeof visitpadMedicineEditFormSchema>;
export type VisitpadChronicIllnessCreateFormSchema = z.infer<
  typeof visitpadChronicIllnessCreateFormSchema
>;
export type VisitpadChronicIllnessCreateFormInput = z.input<
  typeof visitpadChronicIllnessCreateFormSchema
>;
export type VisitpadChronicIllnessEditFormSchema = z.infer<
  typeof visitpadChronicIllnessEditFormSchema
>;
export type VisitpadChronicIllnessEditFormInput = z.input<
  typeof visitpadChronicIllnessEditFormSchema
>;
export type VisitpadProcedureCreateFormSchema = z.infer<typeof visitpadProcedureCreateFormSchema>;
export type VisitpadProcedureCreateFormInput = z.input<typeof visitpadProcedureCreateFormSchema>;
export type VisitpadProcedureEditFormSchema = z.infer<typeof visitpadProcedureEditFormSchema>;
export type VisitpadProcedureEditFormInput = z.input<typeof visitpadProcedureEditFormSchema>;
export type VisitpadVaccineCreateFormSchema = z.infer<typeof visitpadVaccineCreateFormSchema>;
export type VisitpadVaccineEditFormSchema = z.infer<typeof visitpadVaccineEditFormSchema>;
export type VisitpadManufacturerCreateFormSchema = z.infer<
  typeof visitpadManufacturerCreateFormSchema
>;
export type VisitpadManufacturerEditFormSchema = z.infer<typeof visitpadManufacturerEditFormSchema>;
export type VisitpadVitalEditFormSchema = z.infer<typeof visitpadVitalEditFormSchema>;

/**
 * Form-input aliases (pre-transform shape RHF holds in its fields).
 * Schemas use `.default()` / `.coerce` / `.transform()`, so `z.input` ≠ `z.infer`.
 * RHF v5 (`@hookform/resolvers@5`) types the resolver as `Resolver<Input, ctx, Output>`,
 * so each page must declare `useForm<Input, unknown, Output>` to line the two up.
 */
export type VisitpadUnitCreateInput = z.input<typeof visitpadUnitCreateSchema>;
export type VisitpadUnitEditFormInput = z.input<typeof visitpadUnitEditFormSchema>;
export type VisitpadDiagnosisCreateFormInput = z.input<typeof visitpadDiagnosisCreateFormSchema>;
export type VisitpadDiagnosisEditFormInput = z.input<typeof visitpadDiagnosisEditFormSchema>;
export type VisitpadAllergenCreateFormInput = z.input<typeof visitpadAllergenCreateFormSchema>;
export type VisitpadAllergenEditFormInput = z.input<typeof visitpadAllergenEditFormSchema>;
export type VisitpadAllergyReactionCreateFormInput = z.input<
  typeof visitpadAllergyReactionCreateFormSchema
>;
export type VisitpadAllergyReactionEditFormInput = z.input<
  typeof visitpadAllergyReactionEditFormSchema
>;
export type VisitpadChiefComplaintCreateFormInput = z.input<
  typeof visitpadChiefComplaintCreateFormSchema
>;
export type VisitpadChiefComplaintEditFormInput = z.input<
  typeof visitpadChiefComplaintEditFormSchema
>;
export type VisitpadVaccineCreateFormInput = z.input<typeof visitpadVaccineCreateFormSchema>;
export type VisitpadVaccineEditFormInput = z.input<typeof visitpadVaccineEditFormSchema>;
export type VisitpadManufacturerCreateFormInput = z.input<
  typeof visitpadManufacturerCreateFormSchema
>;
export type VisitpadManufacturerEditFormInput = z.input<typeof visitpadManufacturerEditFormSchema>;
export type VisitpadRxColumnCreateFormInput = z.input<typeof visitpadRxColumnCreateFormSchema>;
export type VisitpadRxColumnEditFormInput = z.input<typeof visitpadRxColumnEditFormSchema>;
