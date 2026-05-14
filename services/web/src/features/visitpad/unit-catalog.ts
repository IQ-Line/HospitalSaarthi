import type { VisitpadUnit } from './types';

/** Active, non-deleted units for catalog pickers (sorted for stable UI). */
export function visitpadActiveUnitRows(units: VisitpadUnit[] | undefined): VisitpadUnit[] {
  return (units ?? [])
    .filter((u) => u.is_active && !u.is_deleted)
    .slice()
    .sort((a, b) => a.display_order - b.display_order || a.code.localeCompare(b.code));
}

/** Visitpad Masters–style list line: `code - display_name` (e.g. `g - Gram`). */
export function visitpadUnitLegacyOptionLabel(u: Pick<VisitpadUnit, 'code' | 'display_name'>): string {
  return `${u.code} - ${u.display_name}`;
}

/**
 * Options for a conversion From/To dropdown. Ensures `currentCode` appears even if
 * missing from the active catalog (inactive unit or drift).
 */
export function visitpadConversionUnitSelectOptions(
  rows: VisitpadUnit[],
  currentCode: string,
): { code: string; label: string }[] {
  const list = rows.map((u) => ({
    code: u.code,
    label: visitpadUnitLegacyOptionLabel(u),
  }));
  const trimmed = currentCode.trim();
  if (trimmed && !list.some((x) => x.code === trimmed)) {
    list.unshift({ code: trimmed, label: `${trimmed} — not in active catalog` });
  }
  return list;
}
