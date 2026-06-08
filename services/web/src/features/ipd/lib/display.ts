import type { AdmissionStatus, AdmissionType } from '../types';

const STATUS_STYLES: Record<AdmissionStatus, string> = {
  requested: 'bg-muted text-muted-foreground',
  pending_clearance: 'bg-amber-100 text-amber-800',
  approved: 'bg-emerald-100 text-emerald-800',
};

const STATUS_LABELS: Record<AdmissionStatus, string> = {
  requested: 'requested',
  pending_clearance: 'pending clearance',
  approved: 'approved',
};

const TYPE_LABELS: Record<AdmissionType, string> = {
  planned: 'Planned',
  emergency: 'Emergency',
};

export function admissionStatusBadgeClass(status: AdmissionStatus): string {
  return STATUS_STYLES[status];
}

export function admissionStatusLabel(status: AdmissionStatus): string {
  return STATUS_LABELS[status];
}

export function admissionTypeLabel(type: AdmissionType): string {
  return TYPE_LABELS[type];
}

export function formatAdmissionRequestedAt(iso: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleString('en-IN');
}

export const ADMISSION_TYPES = ['planned', 'emergency'] as const;
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
