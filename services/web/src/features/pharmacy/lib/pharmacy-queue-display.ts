import type { PharmacyDispenseStatus, PharmacyQueueItem } from '../types';

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

export function pharmacyQueueStatusLabel(status: PharmacyDispenseStatus): string {
  if (status === 'partial_issue') return 'Partial issue';
  if (status === 'issued') return 'Issued';
  return 'Pending';
}

export function pharmacyQueueStatusBadgeClass(status: PharmacyDispenseStatus): string {
  if (status === 'partial_issue') return 'bg-amber-100 text-amber-900';
  if (status === 'issued') return 'bg-green-100 text-green-800';
  return 'bg-orange-100 text-orange-800';
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
  filter: 'all' | 'pending' | 'partial_issue' | 'issued',
): boolean {
  if (filter === 'all') return true;
  return row.dispense_status === filter;
}

export function dispenseSaveStatusLabel(status: PharmacyDispenseStatus): string {
  if (status === 'partial_issue') return 'Partial issue';
  if (status === 'issued') return 'Saved';
  return 'Unsaved';
}
