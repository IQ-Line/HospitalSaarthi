import type { OpdPrescriptionMedicineLine, OpdPrescriptionSnapshot } from '../types';

export function formatPrescriptionRelativeTime(finalizedAt: string | null | undefined): string | null {
  if (!finalizedAt) return null;
  const date = new Date(finalizedAt);
  if (Number.isNaN(date.getTime())) return null;

  const diffMs = date.getTime() - Date.now();
  const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));
  const rtf = new Intl.RelativeTimeFormat('en', { numeric: 'auto' });

  if (Math.abs(diffDays) >= 7) {
    const diffWeeks = Math.round(diffDays / 7);
    return rtf.format(diffWeeks, 'week');
  }
  if (Math.abs(diffDays) >= 1) {
    return rtf.format(diffDays, 'day');
  }

  const diffHours = Math.round(diffMs / (1000 * 60 * 60));
  if (Math.abs(diffHours) >= 1) {
    return rtf.format(diffHours, 'hour');
  }

  const diffMinutes = Math.round(diffMs / (1000 * 60));
  return rtf.format(diffMinutes, 'minute');
}

export function formatMedicineLineTitle(medicine: OpdPrescriptionMedicineLine): string {
  const name = medicine.name.trim();
  if (!medicine.strength?.trim()) return name;
  return `${name} (${medicine.strength.trim()})`;
}

export function formatMedicineSchedule(medicine: OpdPrescriptionMedicineLine): string {
  const dosage = medicine.dosage?.trim();
  const durationRaw = medicine.duration?.trim();
  const duration =
    durationRaw && /^\d+$/.test(durationRaw) ? `${durationRaw} days` : durationRaw;
  if (dosage && duration) return `${dosage} · ${duration}`;
  if (dosage) return dosage;
  if (duration) return duration;
  if (medicine.frequency?.trim()) return medicine.frequency.trim();
  return '—';
}

export function formatDoctorAttribution(doctorName: string | null | undefined): string | null {
  if (!doctorName?.trim()) return null;
  const trimmed = doctorName.trim();
  return trimmed.toLowerCase().startsWith('dr') ? `by ${trimmed}` : `by Dr. ${trimmed}`;
}
