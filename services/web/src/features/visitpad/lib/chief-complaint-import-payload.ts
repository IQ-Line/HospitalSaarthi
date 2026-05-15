import type { VisitpadChiefComplaint } from '@/features/visitpad/types';

/** Build a create payload from a global-catalog chief complaint row (for tenant import). */
export function visitpadGlobalChiefComplaintToCreateBody(
  row: VisitpadChiefComplaint,
): Record<string, unknown> {
  return {
    code: row.code,
    display_name: row.display_name,
    short_name: row.short_name?.trim() ? row.short_name.trim() : null,
    body_system: row.body_system,
    triage_priority: row.triage_priority,
    synonyms: Array.isArray(row.synonyms) ? row.synonyms : [],
    is_paediatric_relevant: Boolean(row.is_paediatric_relevant),
    display_order: row.display_order ?? 0,
    is_active: row.is_active ?? true,
    snomed_code: row.snomed_code?.trim() ? row.snomed_code.trim() : null,
  };
}
