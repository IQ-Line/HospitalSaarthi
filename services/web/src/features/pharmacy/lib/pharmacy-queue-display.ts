import type { PharmacyQueueItem } from '../types';

export function formatPharmacyQueuedAt(isoDate: string): string {
  const date = new Date(isoDate);
  if (Number.isNaN(date.getTime())) return isoDate;
  const day = date.getDate().toString().padStart(2, '0');
  const month = date.toLocaleString('en-US', { month: 'short' });
  const year = date.getFullYear();
  const hours = date.getHours().toString().padStart(2, '0');
  const minutes = date.getMinutes().toString().padStart(2, '0');
  return `${day}-${month}-${year} ${hours}:${minutes}`;
}

export function formatRxNumber(prescriptionId: string | null): string {
  if (!prescriptionId) return '—';
  const compact = prescriptionId.replace(/-/g, '');
  return `RX-${compact.slice(-12).toUpperCase()}`;
}

export function formatShortVisitId(visitId: string | null): string {
  if (!visitId) return 'Walk-in';
  return visitId.slice(0, 8).toUpperCase();
}

export function formatQueuePatientSecondaryId(row: PharmacyQueueItem): string {
  if (row.walk_in_order) {
    return row.phone?.trim() || row.record_id?.slice(0, 8) || 'Walk-in';
  }
  return row.uhid ?? row.patient_id?.slice(0, 8) ?? '—';
}

export function formatDoctorDisplay(row: PharmacyQueueItem): string {
  const name = row.doctor_name?.trim();
  if (name) return name;
  if (row.doctor_id?.trim()) return row.doctor_id.slice(0, 8);
  return '—';
}

export function formatPatientDisplay(row: PharmacyQueueItem): string {
  const name = row.patient_name?.trim() || 'Unknown patient';
  const age = row.age_years;
  const genderLetter =
    row.gender === 'male'
      ? 'M'
      : row.gender === 'female'
        ? 'F'
        : row.gender?.charAt(0).toUpperCase() ?? '—';
  if (age != null && age > 0) {
    return `${name} (${age}, ${genderLetter})`;
  }
  return name;
}

export function pharmacyQueueStatusLabel(hasDispense: boolean): string {
  return hasDispense ? 'Issued' : 'Pending';
}

export function pharmacyQueueStatusBadgeClass(hasDispense: boolean): string {
  return hasDispense
    ? 'bg-green-100 text-green-800'
    : 'bg-orange-100 text-orange-800';
}

export function matchesPharmacyQueueSearch(row: PharmacyQueueItem, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;

  const rxToken = row.prescription_id
    ? `rx-${row.prescription_id.replace(/-/g, '').slice(-12)}`
    : '';

  const haystack = [
    row.patient_name,
    row.uhid,
    row.phone,
    row.record_id,
    row.record_id?.slice(0, 8),
    row.visit_id,
    row.visit_id?.slice(0, 8),
    row.prescription_id,
    rxToken,
    row.patient_id,
    row.walk_in_patient_id,
    row.doctor_name,
  ]
    .filter((value): value is string => typeof value === 'string' && value.length > 0)
    .join(' ')
    .toLowerCase();

  return haystack.includes(q);
}

export function matchesPharmacyQueueStatus(
  row: PharmacyQueueItem,
  filter: 'all' | 'pending' | 'issued',
): boolean {
  if (filter === 'all') return true;
  if (filter === 'pending') return !row.has_dispense;
  return row.has_dispense;
}
