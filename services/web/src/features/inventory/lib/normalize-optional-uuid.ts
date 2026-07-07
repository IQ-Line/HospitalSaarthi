const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const PLACEHOLDER_MANUFACTURER_IDS = new Set(['', 'mfr-none', '__none__']);

export function isUuid(value: string): boolean {
  return UUID_RE.test(value);
}

/** Returns a UUID string or `null` for empty / mock placeholder values. */
export function normalizeOptionalUuid(value: string | null | undefined): string | null {
  if (value == null) return null;
  const trimmed = value.trim();
  if (!trimmed || PLACEHOLDER_MANUFACTURER_IDS.has(trimmed)) return null;
  return isUuid(trimmed) ? trimmed : null;
}
