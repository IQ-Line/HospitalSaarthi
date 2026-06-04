import type { VisitpadMedicine } from '@/features/visitpad/types';
import type {
  VisitpadMedicineCreateFormInput,
  VisitpadMedicineCreateFormSchema,
  VisitpadMedicineEditFormInput,
  VisitpadMedicineEditFormSchema,
} from '@/features/visitpad/validation';

export function splitCsvInput(input: string | undefined | null): string[] {
  if (input == null || !String(input).trim()) return [];
  return String(input)
    .split(',')
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

function routesFromCsv(csv: string | undefined | null): string[] {
  return splitCsvInput(csv).map((r) => r.toLowerCase());
}

function trimOpt(s: string | undefined | null): string | null {
  if (s == null) return null;
  const t = String(s).trim();
  return t.length ? t : null;
}

/** Maps shared medicine form fields (create or edit) to API JSON (no `code`). */
function medicineSharedFieldsToApi(
  v: VisitpadMedicineEditFormSchema | VisitpadMedicineCreateFormSchema,
): Record<string, unknown> {
  const brand_names = splitCsvInput(v.brand_names_csv);
  const route_of_admin = routesFromCsv(v.routes_csv);
  const allergen_classes = splitCsvInput(v.allergen_classes_csv);
  const contraindications = splitCsvInput(v.contraindications_csv);

  const displayName = v.display_name.trim();
  return {
    display_name: displayName,
    generic_name: (v.generic_name?.trim() ?? '') || displayName,
    short_name: trimOpt(v.short_name),
    brand_names,
    drug_class: (v.drug_class?.trim() ?? '') || '',
    drug_subclass: trimOpt(v.drug_subclass),
    dosage_form: (v.dosage_form?.trim() ?? '') || '',
    route_of_admin,
    strength_value: v.strength_value,
    strength_unit: trimOpt(v.strength_unit),
    strength_display: (v.strength_display ?? '').trim() || '',
    concentration_value: v.concentration_value,
    concentration_unit: trimOpt(v.concentration_unit),
    volume_per_unit: v.volume_per_unit,
    sku_code: null,
    barcode: null,
    pack_size: null,
    pack_unit: null,
    manufacturer: null,
    storage_condition: null,
    expiry_tracking: false,
    is_dispensable: true,
    schedule: v.schedule ?? 'otc',
    is_controlled_substance: v.is_controlled_substance,
    is_narcotic: v.is_narcotic,
    requires_prescription: v.requires_prescription,
    is_restricted_antibiotic: v.is_restricted_antibiotic,
    allergen_classes,
    contraindications,
    search_tags: [] as string[],
    atc_code: null,
    rxnorm_code: null,
    snomed_substance_code: trimOpt(v.snomed_substance_code),
    snomed_product_code: trimOpt(v.snomed_product_code),
    pregnancy_category: v.pregnancy_category ?? 'not_set',
    lactation_safety: v.lactation_safety ?? 'not_set',
    pediatric_use: v.pediatric_use ?? 'not_set',
    max_dose_per_day_value: v.max_dose_per_day_value,
    max_dose_per_day_unit: trimOpt(v.max_dose_per_day_unit),
    black_box_warning: v.black_box_warning,
    black_box_warning_text: v.black_box_warning
      ? trimOpt(v.black_box_warning_text)
      : null,
    default_dose_value: v.default_dose_value,
    default_dose_unit: trimOpt(v.default_dose_unit),
    default_frequency: trimOpt(v.default_frequency),
    default_duration_days: v.default_duration_days,
    default_route: trimOpt(v.default_route),
    default_instructions: trimOpt(v.default_instructions),
    typical_quantity: v.typical_quantity,
    notes: trimOpt(v.notes),
    display_order: v.display_order,
    is_active: v.is_active,
  };
}

export function visitpadMedicineCreatePayloadFromForm(
  v: VisitpadMedicineCreateFormSchema,
): Record<string, unknown> {
  return { code: v.code, ...medicineSharedFieldsToApi(v) };
}

export function visitpadMedicinePatchPayloadFromForm(
  v: VisitpadMedicineEditFormSchema,
): Record<string, unknown> {
  return medicineSharedFieldsToApi(v);
}

export function joinCsvFromList(value: unknown): string {
  if (!Array.isArray(value)) return '';
  return value.filter((x): x is string => typeof x === 'string' && x.trim().length > 0).join(', ');
}

const PREG = new Set(['not_set', 'a', 'b', 'c', 'd', 'x']);
const LACT = new Set(['not_set', 'compatible', 'caution', 'avoid']);
const PED = new Set(['not_set', 'approved', 'caution', 'avoid']);

export function emptyMedicineCreateForm(): VisitpadMedicineCreateFormInput {
  return {
    code: '',
    generic_name: '',
    display_name: '',
    short_name: undefined,
    drug_class: '',
    drug_subclass: undefined,
    brand_names_csv: undefined,
    snomed_substance_code: undefined,
    snomed_product_code: undefined,
    display_order: 0,
    dosage_form: undefined,
    routes_csv: undefined,
    strength_value: undefined,
    strength_unit: undefined,
    strength_display: undefined,
    concentration_value: undefined,
    concentration_unit: undefined,
    volume_per_unit: undefined,
    schedule: undefined,
    requires_prescription: false,
    is_controlled_substance: false,
    is_narcotic: false,
    is_restricted_antibiotic: false,
    allergen_classes_csv: undefined,
    contraindications_csv: undefined,
    pregnancy_category: undefined,
    lactation_safety: undefined,
    pediatric_use: undefined,
    max_dose_per_day_value: undefined,
    max_dose_per_day_unit: undefined,
    black_box_warning: false,
    black_box_warning_text: undefined,
    default_dose_value: undefined,
    default_dose_unit: undefined,
    default_frequency: undefined,
    default_duration_days: undefined,
    default_route: undefined,
    typical_quantity: undefined,
    default_instructions: undefined,
    notes: undefined,
    is_active: true,
  };
}

export function emptyMedicineEditForm(): VisitpadMedicineEditFormInput {
  const { code: _c, ...rest } = emptyMedicineCreateForm();
  return rest;
}

function pregnancySafe(v: string | null | undefined): 'not_set' | 'a' | 'b' | 'c' | 'd' | 'x' {
  const s = (v ?? 'not_set').trim();
  return PREG.has(s) ? (s as 'not_set' | 'a' | 'b' | 'c' | 'd' | 'x') : 'not_set';
}

function lactationSafe(v: string | null | undefined): 'not_set' | 'compatible' | 'caution' | 'avoid' {
  const s = (v ?? 'not_set').trim();
  return LACT.has(s) ? (s as 'not_set' | 'compatible' | 'caution' | 'avoid') : 'not_set';
}

function pediatricSafe(v: string | null | undefined): 'not_set' | 'approved' | 'caution' | 'avoid' {
  const s = (v ?? 'not_set').trim();
  return PED.has(s) ? (s as 'not_set' | 'approved' | 'caution' | 'avoid') : 'not_set';
}

export function visitpadMedicineEditFormFromRow(row: VisitpadMedicine): VisitpadMedicineEditFormInput {
  return {
    generic_name: row.generic_name,
    display_name: row.display_name,
    short_name: row.short_name ?? undefined,
    drug_class: row.drug_class,
    drug_subclass: row.drug_subclass ?? undefined,
    brand_names_csv: joinCsvFromList(row.brand_names ?? []),
    snomed_substance_code: row.snomed_substance_code ?? undefined,
    snomed_product_code: row.snomed_product_code ?? undefined,
    display_order: row.display_order,
    dosage_form: row.dosage_form,
    routes_csv: joinCsvFromList(row.route_of_admin ?? []),
    strength_value: row.strength_value == null ? undefined : String(row.strength_value),
    strength_unit: row.strength_unit ?? undefined,
    strength_display: row.strength_display || undefined,
    concentration_value: row.concentration_value == null ? undefined : String(row.concentration_value),
    concentration_unit: row.concentration_unit ?? undefined,
    volume_per_unit: row.volume_per_unit == null ? undefined : String(row.volume_per_unit),
    schedule: row.schedule as VisitpadMedicineEditFormInput['schedule'],
    requires_prescription: row.requires_prescription,
    is_controlled_substance: row.is_controlled_substance,
    is_narcotic: row.is_narcotic,
    is_restricted_antibiotic: row.is_restricted_antibiotic,
    allergen_classes_csv: joinCsvFromList(row.allergen_classes ?? []),
    contraindications_csv: joinCsvFromList(row.contraindications ?? []),
    pregnancy_category: pregnancySafe(row.pregnancy_category),
    lactation_safety: lactationSafe(row.lactation_safety),
    pediatric_use: pediatricSafe(row.pediatric_use),
    max_dose_per_day_value: row.max_dose_per_day_value == null ? undefined : String(row.max_dose_per_day_value),
    max_dose_per_day_unit: row.max_dose_per_day_unit ?? undefined,
    black_box_warning: row.black_box_warning,
    black_box_warning_text: row.black_box_warning_text ?? undefined,
    default_dose_value: row.default_dose_value == null ? undefined : String(row.default_dose_value),
    default_dose_unit: row.default_dose_unit ?? undefined,
    default_frequency: row.default_frequency ?? undefined,
    default_duration_days: row.default_duration_days == null ? undefined : String(row.default_duration_days),
    default_route: row.default_route ?? undefined,
    typical_quantity: row.typical_quantity == null ? undefined : String(row.typical_quantity),
    default_instructions: row.default_instructions ?? undefined,
    notes: row.notes ?? undefined,
    is_active: row.is_active,
  };
}
