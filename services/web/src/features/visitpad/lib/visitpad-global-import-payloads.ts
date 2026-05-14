import type {
  VisitpadAllergen,
  VisitpadAllergyReaction,
  VisitpadChronicIllness,
  VisitpadDiagnosis,
  VisitpadManufacturer,
  VisitpadMedicine,
  VisitpadProcedure,
  VisitpadRxColumn,
  VisitpadUnit,
  VisitpadUnitConversion,
  VisitpadVaccine,
} from '@/features/visitpad/types';
import {
  visitpadMedicineCreatePayloadFromForm,
  visitpadMedicineEditFormFromRow,
} from '@/features/visitpad/medicine-create-defaults';
import {
  visitpadChronicIllnessCreateFormSchema,
  visitpadDiagnosisCreateFormSchema,
  visitpadManufacturerCreateFormSchema,
  visitpadRxColumnCreateFormSchema,
  visitpadUnitConversionCreateSchema,
  visitpadUnitCreateSchema,
  visitpadVaccineCreateFormSchema,
  type VisitpadMedicineCreateFormSchema,
} from '@/features/visitpad/validation';

export function visitpadGlobalUnitToCreateBody(row: VisitpadUnit): Record<string, unknown> {
  const body = {
    code: row.code,
    display_name: row.display_name,
    dimension: row.dimension,
    ucum_code: row.ucum_code ?? null,
    is_canonical: row.is_canonical ?? false,
    display_order: row.display_order ?? 0,
    is_active: row.is_active ?? true,
  };
  const p = visitpadUnitCreateSchema.safeParse(body);
  if (!p.success) throw new Error(p.error.issues.map((i) => i.message).join('; '));
  return p.data as unknown as Record<string, unknown>;
}

export function visitpadGlobalUnitConversionToCreateBody(row: VisitpadUnitConversion): Record<string, unknown> {
  const body = {
    from_unit_code: row.from_unit_code,
    to_unit_code: row.to_unit_code,
    factor: row.factor,
    offset_value: row.offset_value ?? 0,
    display_order: row.display_order ?? 0,
  };
  const p = visitpadUnitConversionCreateSchema.safeParse(body);
  if (!p.success) throw new Error(p.error.issues.map((i) => i.message).join('; '));
  return p.data as unknown as Record<string, unknown>;
}

export function visitpadGlobalDiagnosisToCreateBody(row: VisitpadDiagnosis): Record<string, unknown> {
  const body: Record<string, unknown> = {
    code: row.code,
    display_name: row.display_name,
    short_name: row.short_name?.trim() ? row.short_name.trim() : null,
    is_chronic_flag: Boolean(row.is_chronic_flag),
    is_notifiable: Boolean(row.is_notifiable),
    display_order: row.display_order ?? 0,
    is_active: row.is_active ?? true,
    snomed_code: row.snomed_code?.trim() ? row.snomed_code.trim() : null,
  };
  const icd10 = row.icd10_code?.trim();
  const ver = row.icd_version;
  const off = row.official_descriptor?.trim();
  const cat = row.category;
  if (icd10 && ver && off && cat) {
    body.icd10_code = icd10;
    body.icd_version = ver;
    body.official_descriptor = off;
    body.category = cat;
  }
  const p = visitpadDiagnosisCreateFormSchema.safeParse(body);
  if (!p.success) throw new Error(p.error.issues.map((i) => i.message).join('; '));
  return body;
}

export function visitpadGlobalAllergenToCreateBody(row: VisitpadAllergen): Record<string, unknown> {
  return {
    code: row.code.trim(),
    display_name: row.display_name.trim(),
    allergen_type: row.allergen_type,
    drug_class: row.drug_class ?? null,
    reaction_severity_default: row.reaction_severity_default ?? 'unknown',
    display_order: row.display_order ?? 0,
    is_active: row.is_active ?? true,
    snomed_code: row.snomed_code?.trim() ? row.snomed_code.trim() : null,
  };
}

export function visitpadGlobalAllergyReactionToCreateBody(row: VisitpadAllergyReaction): Record<string, unknown> {
  return {
    code: row.code.trim(),
    display_name: row.display_name.trim(),
    short_name: null,
    snomed_code: null,
    display_order: row.display_order ?? 0,
    is_active: row.is_active ?? true,
  };
}

export function visitpadGlobalRxColumnToCreateBody(row: VisitpadRxColumn): Record<string, unknown> {
  const p = visitpadRxColumnCreateFormSchema.safeParse({
    display_name: row.display_name,
    code: row.code,
    is_active: row.is_active ?? true,
  });
  if (!p.success) throw new Error(p.error.issues.map((i) => i.message).join('; '));
  return {
    section: row.section,
    display_name: p.data.display_name,
    code: p.data.code,
    extra_unit: row.extra_unit ?? null,
    display_order: row.display_order ?? 0,
    is_active: p.data.is_active,
  };
}

export function visitpadGlobalChronicIllnessToCreateBody(row: VisitpadChronicIllness): Record<string, unknown> {
  const body = {
    icd10_code: row.icd10_code,
    display_name: row.display_name,
    category: row.category,
    snomed_code: row.snomed_code?.trim() ? row.snomed_code.trim() : null,
    chronic_illness_prompt: Boolean(row.chronic_illness_prompt),
    is_active: row.is_active ?? true,
  };
  const p = visitpadChronicIllnessCreateFormSchema.safeParse(body);
  if (!p.success) throw new Error(p.error.issues.map((i) => i.message).join('; '));
  return { ...(p.data as unknown as Record<string, unknown>), display_order: row.display_order ?? 0 };
}

export function visitpadGlobalProcedureToCreateBody(row: VisitpadProcedure): Record<string, unknown> {
  const shortRaw = row.short_name?.trim();
  const mod = row.type_modality?.trim();
  const snomed = row.snomed_code?.trim();
  return {
    cpt_code: row.cpt_code,
    short_name: shortRaw && shortRaw.length > 0 ? shortRaw : null,
    official_descriptor: (row.official_descriptor ?? row.display_name).trim(),
    display_name: row.display_name,
    category: row.category,
    billing_category: row.billing_category,
    duration_minutes: row.duration_minutes ?? 0,
    requires_consent: row.requires_consent ?? false,
    type_modality: mod && mod.length > 0 ? mod : null,
    display_order: row.display_order ?? 0,
    is_active: row.is_active ?? true,
    snomed_code: snomed && snomed.length > 0 ? snomed : null,
  };
}

export function visitpadGlobalVaccineToCreateBody(row: VisitpadVaccine): Record<string, unknown> {
  const body = {
    code: row.code,
    display_name: row.display_name,
    short_name: row.short_name?.trim() ? row.short_name.trim() : undefined,
    is_active: row.is_active ?? true,
  };
  const p = visitpadVaccineCreateFormSchema.safeParse(body);
  if (!p.success) throw new Error(p.error.issues.map((i) => i.message).join('; '));
  return {
    ...p.data,
    display_order: row.display_order ?? 0,
  };
}

export function visitpadGlobalManufacturerToCreateBody(row: VisitpadManufacturer): Record<string, unknown> {
  const body = {
    code: row.code,
    display_name: row.display_name,
    short_name: row.short_name?.trim() ?? '',
    is_active: row.is_active ?? true,
  };
  const p = visitpadManufacturerCreateFormSchema.safeParse(body);
  if (!p.success) throw new Error(p.error.issues.map((i) => i.message).join('; '));
  return {
    code: p.data.code.trim().toLowerCase(),
    display_name: p.data.display_name,
    short_name: p.data.short_name === '' ? null : p.data.short_name,
    display_order: row.display_order ?? 0,
    is_active: p.data.is_active,
  };
}

export function visitpadMedicineCreatePayloadFromCatalogRow(row: VisitpadMedicine): Record<string, unknown> {
  const form = {
    code: row.code,
    ...visitpadMedicineEditFormFromRow(row),
  } as VisitpadMedicineCreateFormSchema;
  return visitpadMedicineCreatePayloadFromForm(form);
}
