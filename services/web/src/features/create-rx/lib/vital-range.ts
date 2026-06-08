import type { VisitpadVital } from '@/features/visitpad/types';

export interface VitalNumericRange {
  min: number | null;
  max: number | null;
}

const PAEDIATRIC_AGE_THRESHOLD = 18;

function parseRangeBound(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) return null;
    const parsed = Number(trimmed);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

/** Parse `{ min?, max? }` from Visitpad vital range JSON. */
export function parseVitalNumericRange(
  range: Record<string, unknown> | undefined | null,
): VitalNumericRange | null {
  if (!range || typeof range !== 'object') return null;
  const min = parseRangeBound(range.min);
  const max = parseRangeBound(range.max);
  if (min === null && max === null) return null;
  return { min, max };
}

/** Pick adult vs paediatric normal range using patient age when available. */
export function resolveVitalNormalRange(
  vital: Pick<VisitpadVital, 'normal_range_adult' | 'normal_range_paediatric'>,
  patientAge?: number,
): VitalNumericRange | null {
  const adult = parseVitalNumericRange(vital.normal_range_adult);
  const paediatric = parseVitalNumericRange(vital.normal_range_paediatric);

  if (patientAge != null && patientAge < PAEDIATRIC_AGE_THRESHOLD) {
    return paediatric ?? adult;
  }
  return adult ?? paediatric;
}

/** Human-readable range for the visitpad vitals UI (e.g. `90–120`, `≥ 70`). */
export function formatVitalRangeLabel(range: VitalNumericRange): string | null {
  const { min, max } = range;
  if (min != null && max != null) return `${min}–${max}`;
  if (min != null) return `≥ ${min}`;
  if (max != null) return `≤ ${max}`;
  return null;
}

export function isVitalValueOutOfRange(value: string, range: VitalNumericRange): boolean {
  const trimmed = value.trim();
  if (!trimmed) return false;
  const numeric = Number(trimmed);
  if (!Number.isFinite(numeric)) return false;
  if (range.min != null && numeric < range.min) return true;
  if (range.max != null && numeric > range.max) return true;
  return false;
}
