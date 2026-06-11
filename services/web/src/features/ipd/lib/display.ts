import type { EpisodeStatus, AdmissionType } from '../types';

const STATUS_STYLES: Record<EpisodeStatus, string> = {
  scheduled: 'bg-muted text-muted-foreground',
  admitted: 'bg-blue-100 text-blue-800',
  discharge_planning: 'bg-violet-100 text-violet-800',
  pending_clearance: 'bg-amber-100 text-amber-800',
  discharged: 'bg-emerald-100 text-emerald-800',
  cancelled: 'bg-red-100 text-red-800',
};

const STATUS_LABELS: Record<EpisodeStatus, string> = {
  scheduled: 'scheduled',
  admitted: 'admitted',
  discharge_planning: 'discharge planning',
  pending_clearance: 'pending clearance',
  discharged: 'discharged',
  cancelled: 'cancelled',
};

const TYPE_LABELS: Record<AdmissionType, string> = {
  planned: 'Planned',
  emergency: 'Emergency',
  direct: 'Direct',
  daycare: 'Day care',
  transfer_in: 'Transfer in',
};

export function admissionStatusBadgeClass(status: EpisodeStatus): string {
  return STATUS_STYLES[status];
}

export function admissionStatusLabel(status: EpisodeStatus): string {
  return STATUS_LABELS[status];
}

export function admissionTypeLabel(type: AdmissionType): string {
  return TYPE_LABELS[type];
}

export function formatAdmissionRequestedAt(iso: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleString('en-IN');
}

export function formatEnumLabel(value: string): string {
  if (!value) return '—';
  return value
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

export function admissionSourceLabel(source: string): string {
  const labels: Record<string, string> = {
    opd_referral: 'OPD',
    er: 'ER',
    direct: 'Direct',
    transfer: 'Transfer',
  };
  return labels[source] ?? formatEnumLabel(source);
}

export function financialClassLabel(value: string): string {
  return formatEnumLabel(value);
}

/** Phase 0 mock — backend LLD also has direct, transfer_in, daycare. */
export const ADMISSION_TYPES = ['planned', 'emergency'] as const;
// TODO(Phase 1): add daycare, direct, transfer_in to form selects when wired to API.

export const ADMISSION_SOURCES = ['opd_referral', 'er', 'direct', 'transfer'] as const;
export const ADMISSION_SPECIALTIES = [
  'general_medicine',
  'obstetrics_gynecology',
  'oncology',
  'cardiology',
  'orthopedics',
] as const;
export const BED_CLASSES = ['any', 'general', 'private', 'isolation'] as const;
export const FINANCIAL_CLASSES = ['general', 'corporate', 'insurance', 'government'] as const;
export const ADMISSION_FLAGS = [
  'High Risk',
  'Fall Risk',
  'Isolation',
  'Vip',
  'Medico Legal',
  'Allergy Alert',
] as const;

// TODO(Phase 1): deposit collection field — handoff requires deposit (zero allowed).
