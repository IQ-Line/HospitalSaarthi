import type { HistoricalSearchField } from '../types';

export function formatHistoricalDateTime(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  const day = date.getDate().toString().padStart(2, '0');
  const month = date.toLocaleString('en-GB', { month: 'short' });
  const year = date.getFullYear();
  const hours = date.getHours().toString().padStart(2, '0');
  const minutes = date.getMinutes().toString().padStart(2, '0');
  return `${day} ${month} ${year}, ${hours}:${minutes}`;
}

export function formatHistoricalShortDate(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  const day = date.getDate().toString().padStart(2, '0');
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const year = date.getFullYear().toString().slice(-2);
  return `${day}/${month}/${year}`;
}

export function formatAbhaNumber(value: string | null | undefined): string {
  const raw = value?.replace(/\D/g, '') ?? '';
  if (raw.length !== 14) return value?.trim() || 'NA';
  return `${raw.slice(0, 2)}-${raw.slice(2, 6)}-${raw.slice(6, 10)}-${raw.slice(10, 14)}`;
}

/** Normalize user input for EMPI ABHA exact-match search (stored with dashes). */
export function normalizeAbhaForSearch(raw: string): string {
  const trimmed = raw.trim();
  const digits = trimmed.replace(/\D/g, '');
  if (digits.length === 14) {
    return `${digits.slice(0, 2)}-${digits.slice(2, 6)}-${digits.slice(6, 10)}-${digits.slice(10, 14)}`;
  }
  return trimmed;
}

/** Normalize mobile for EMPI search — accepts 10 digits or +91 prefix (not UHID/ABHA-length values). */
export function normalizeIndianPhoneForSearch(raw: string): string | null {
  const digits = raw.replace(/\D/g, '');
  if (digits.length < 10 || digits.length > 13) return null;
  return `+91${digits.slice(-10)}`;
}

/** True when the query shape matches the selected historical-records search field. */
export function isHistoricalSearchQueryValid(
  field: HistoricalSearchField,
  query: string,
): boolean {
  const trimmed = query.trim();
  if (!trimmed) return false;
  const digits = trimmed.replace(/\D/g, '');

  switch (field) {
    case 'patient_name':
      return trimmed.length >= 2 && digits.length !== trimmed.length;
    case 'mobile_number':
      return digits.length >= 10 && digits.length <= 13;
    case 'abha_number':
      return digits.length === 14;
    case 'abha_address':
      return trimmed.includes('@') && trimmed.length >= 3;
    case 'uhid':
      return digits.length >= 15;
    default:
      return false;
  }
}

export function formatPatientNameLink(
  name: string,
  age: number,
  gender: 'male' | 'female' | 'other',
): string {
  const symbol = gender === 'male' ? '♂' : gender === 'female' ? '♀' : '⚧';
  return `${name} ${symbol} (${age}Y)`;
}

export function defaultDateRange(): { startDate: string; endDate: string } {
  const end = new Date();
  const start = new Date();
  start.setDate(end.getDate() - 7);
  return {
    startDate: start.toISOString().slice(0, 10),
    endDate: end.toISOString().slice(0, 10),
  };
}

/** Patient detail tabs (Documents / Reports) — show full history by default. */
export function historicalPatientTabDateRange(): { startDate: string; endDate: string } {
  return { startDate: '', endDate: '' };
}

export function isWithinDateRange(iso: string, startDate: string, endDate: string): boolean {
  if (!startDate && !endDate) return true;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return false;
  const day = iso.slice(0, 10);
  if (startDate && day < startDate) return false;
  if (endDate && day > endDate) return false;
  return true;
}

export function notProvided(value: string | null | undefined): string {
  const trimmed = value?.trim();
  return trimmed ? trimmed : 'Not provided';
}
