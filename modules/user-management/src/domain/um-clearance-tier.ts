/**
 * Maps persisted clearance values to a 0–3 tier for Cerbos comparison with
 * `resource.attr.required_clearance` (Cerbos user resource).
 *
 * Numeric strings use the integer (clamped). Known words map to tiers (view < edit < full).
 */
const WORD_TIER: Readonly<Record<string, number>> = {
  none: 0,
  no: 0,
  deny: 0,
  view: 1,
  read: 1,
  readonly: 1,
  edit: 2,
  write: 2,
  update: 2,
  full: 3,
  delete: 3,
  admin: 3,
};

const MAX_TIER = 3;

export function clearanceValueToTier(raw: string): number {
  const s = raw.trim().toLowerCase();
  if (s.length === 0) return 0;
  const n = Number.parseInt(s, 10);
  if (!Number.isNaN(n) && String(n) === s) {
    return Math.min(MAX_TIER, Math.max(0, n));
  }
  return Math.min(MAX_TIER, WORD_TIER[s] ?? 0);
}

/** Highest tier implied by any value in the principal clearance map (ABAC). */
export function effectiveUmClearanceTierFromClearances(clearances: Record<string, string>): number {
  let max = 0;
  for (const v of Object.values(clearances)) {
    const t = clearanceValueToTier(v);
    if (t > max) max = t;
  }
  return max;
}

export function clampClearanceTierRequired(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.min(MAX_TIER, Math.max(0, Math.trunc(value)));
}
