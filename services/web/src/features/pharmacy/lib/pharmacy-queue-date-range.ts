import type { DateRange } from 'react-day-picker';
import type { PharmacyQueueDateRange } from '../types';

export function parseLocalIsoDate(isoDate: string): Date | undefined {
  if (!isoDate.trim()) return undefined;
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(isoDate.trim());
  if (!match) return undefined;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (!Number.isFinite(year) || !Number.isFinite(month) || !Number.isFinite(day)) return undefined;
  return new Date(year, month - 1, day);
}

export function formatLocalIsoDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function queuedDatesToPickerRange(dateRange: PharmacyQueueDateRange): DateRange | undefined {
  const from = parseLocalIsoDate(dateRange.queued_from);
  const to = parseLocalIsoDate(dateRange.queued_to);
  if (!from && !to) return undefined;
  return { from, to };
}

export function pickerRangeToQueuedDates(range: DateRange | undefined): PharmacyQueueDateRange {
  return {
    queued_from: range?.from ? formatLocalIsoDate(range.from) : '',
    queued_to: range?.to ? formatLocalIsoDate(range.to) : '',
  };
}

function formatDisplayDate(isoDate: string): string {
  const date = parseLocalIsoDate(isoDate);
  if (!date) return isoDate;
  return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

export function formatQueuedDateRangeLabel(dateRange: PharmacyQueueDateRange): string {
  if (dateRange.queued_from && dateRange.queued_to) {
    return `${formatDisplayDate(dateRange.queued_from)} – ${formatDisplayDate(dateRange.queued_to)}`;
  }
  if (dateRange.queued_from) {
    return `From ${formatDisplayDate(dateRange.queued_from)}`;
  }
  if (dateRange.queued_to) {
    return `Until ${formatDisplayDate(dateRange.queued_to)}`;
  }
  return 'Queue date range';
}

export function hasQueuedDateRange(dateRange: PharmacyQueueDateRange): boolean {
  return Boolean(dateRange.queued_from || dateRange.queued_to);
}
