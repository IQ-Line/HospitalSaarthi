/** Local calendar date as `YYYY-MM-DD` (no timezone shift). */
export function parseIsoDateOnly(iso: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso.trim());
  if (!m) return null;
  const y = Number(m[1]);
  const mo = Number(m[2]) - 1;
  const d = Number(m[3]);
  const dt = new Date(y, mo, d);
  if (dt.getFullYear() !== y || dt.getMonth() !== mo || dt.getDate() !== d) return null;
  return dt;
}

export function startOfLocalDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

export type DobParts = {
  day: string;
  month: string;
  year: string;
};

export function sanitizeDobDayInput(raw: string): string {
  return raw.replace(/\D/g, '').slice(0, 2);
}

export function sanitizeDobMonthInput(raw: string): string {
  return raw.replace(/\D/g, '').slice(0, 2);
}

export function sanitizeDobYearInput(raw: string): string {
  return raw.replace(/\D/g, '').slice(0, 4);
}

export function splitIsoToDobParts(iso: string): DobParts {
  const parsed = parseIsoDateOnly(iso);
  if (!parsed) return { day: '', month: '', year: '' };
  return {
    day: String(parsed.getDate()),
    month: String(parsed.getMonth() + 1),
    year: String(parsed.getFullYear()),
  };
}

/** Requires a 4-digit year and valid calendar date. */
export function joinDobPartsToIso(day: string, month: string, year: string): string | null {
  const d = day.trim();
  const m = month.trim();
  const y = year.trim();
  if (!d || !m || y.length !== 4) return null;
  const iso = `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
  return parseIsoDateOnly(iso) ? iso : null;
}

export const DOB_INVALID_MESSAGE = 'Enter valid date';

export function validateDobIso(iso: string): string | null {
  const birth = parseIsoDateOnly(iso);
  if (!birth) return DOB_INVALID_MESSAGE;
  const today = startOfLocalDay(new Date());
  const birthStart = startOfLocalDay(birth);
  if (birthStart > today) return DOB_INVALID_MESSAGE;
  const min = new Date(today);
  min.setFullYear(min.getFullYear() - 125);
  if (birthStart < startOfLocalDay(min)) {
    return DOB_INVALID_MESSAGE;
  }
  return null;
}

export function hasAnyDobPart(parts: DobParts): boolean {
  return Boolean(parts.day.trim() || parts.month.trim() || parts.year.trim());
}

export function formatLocalDateToIso(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function getDobSelectableBounds(): { min: Date; max: Date } {
  const today = startOfLocalDay(new Date());
  const min = new Date(today);
  min.setFullYear(min.getFullYear() - 125);
  return { min: startOfLocalDay(min), max: today };
}

export function isDobSelectableDate(date: Date): boolean {
  const d = startOfLocalDay(date);
  const { min, max } = getDobSelectableBounds();
  return d >= min && d <= max;
}
