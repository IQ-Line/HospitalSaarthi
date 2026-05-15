import type { VisitpadVital } from '@/features/visitpad/types';
import { visitpadVitalCreateSchema } from '@/features/visitpad/validation';

/** Build a create payload from a global-catalog vital row (for tenant import). */
export function visitpadGlobalVitalToCreateBody(row: VisitpadVital): Record<string, unknown> {
  const body: Record<string, unknown> = {
    code: row.code,
    name: row.name,
    short_name: row.short_name?.trim() ? row.short_name : row.name,
    category: row.category,
    data_type: row.data_type,
    unit: row.unit,
    default_unit_code: row.default_unit_code,
    allowed_units: Array.isArray(row.allowed_units)
      ? row.allowed_units.map((u) => String(u)).filter(Boolean)
      : [],
    reference_kind: row.reference_kind ?? 'none',
    reference_json:
      row.reference_json && typeof row.reference_json === 'object' ? row.reference_json : {},
    normal_range_adult:
      row.normal_range_adult && typeof row.normal_range_adult === 'object'
        ? row.normal_range_adult
        : {},
    normal_range_paediatric:
      row.normal_range_paediatric && typeof row.normal_range_paediatric === 'object'
        ? row.normal_range_paediatric
        : {},
    input_method: row.input_method ?? 'manual',
    is_paired: Boolean(row.is_paired),
    pair_code: row.pair_code ?? null,
    critical_low: row.critical_low ?? null,
    critical_high: row.critical_high ?? null,
    display_order: row.display_order ?? 0,
    is_active: row.is_active ?? true,
    loinc_code: row.loinc_code ?? null,
    snomed_observable_code: row.snomed_observable_code ?? null,
  };
  if (body.is_paired && !String(body.pair_code ?? '').trim()) {
    body.is_paired = false;
    body.pair_code = null;
  }
  const parsed = visitpadVitalCreateSchema.safeParse(body);
  if (!parsed.success) {
    throw new Error(parsed.error.issues.map((i) => i.message).join('; ') || 'Invalid vital row');
  }
  return parsed.data as unknown as Record<string, unknown>;
}
