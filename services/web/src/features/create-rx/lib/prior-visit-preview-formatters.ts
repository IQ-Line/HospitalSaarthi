import type { ChiefComplaintRow, DiagnosisRow, MedicineRow } from '../types';

export function formatPriorVisitCardDate(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  const day = date.getDate().toString().padStart(2, '0');
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const year = date.getFullYear();
  return `${day}-${month}-${year}`;
}

export function formatPriorVisitColumnDate(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  const day = date.getDate().toString().padStart(2, '0');
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const year = date.getFullYear().toString().slice(-2);
  return `${day}-${month}-${year}`;
}

export function formatChiefComplaintsLine(complaints: ChiefComplaintRow[]): string {
  const items = complaints.filter((c) => c.complaint.trim());
  if (items.length === 0) return '';

  const names = items.map((c) => c.complaint.trim()).join(', ');
  const first = items[0]!;
  const duration = first.duration.trim()
    ? `Duration-${first.duration.trim()} ${first.durationUnit.trim() || 'days'}`
    : '';
  const severity = first.severity.trim() ? `Severity-${first.severity.trim()}` : '';

  return [`Chief Complaints - ${names}`, duration, severity].filter(Boolean).join(', ');
}

export function formatDiagnosisLine(diagnosis: DiagnosisRow[]): string {
  const notes = diagnosis.map((d) => d.notes.trim()).filter(Boolean);
  return notes.length > 0 ? notes.join(', ') : '- -';
}

export function formatMedicineDosageDisplay(medicine: MedicineRow): string {
  const hasMan =
    medicine.dosageMorning.trim() ||
    medicine.dosageAfternoon.trim() ||
    medicine.dosageNight.trim();

  if (hasMan) {
    return `${medicine.dosageMorning.trim() || '0'}-${medicine.dosageAfternoon.trim() || '0'}-${medicine.dosageNight.trim() || '0'}`;
  }

  if (medicine.frequency.trim()) return medicine.frequency.trim();
  return '-';
}
