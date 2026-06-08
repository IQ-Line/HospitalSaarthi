import type { RegistrationVisitResponse } from '@/features/frontdesk/types';
import type { OpdPrescriptionStatus } from '@/features/create-rx/api/opd-prescription-types';
import type { EmpiPatient } from './empi-patients';
import { empiPatientAgeYears } from './empi-patients';
import { effectiveOpdQueueStatus } from '../lib/registration-visit-status';
import { opdVisitStatusToActionLabel } from '../lib/opd-visit-status';
import type { OpdPatientVisitRow } from '../types';

function shortId(uuid: string): string {
  return uuid.replace(/-/g, '').slice(0, 8).toUpperCase();
}

function formatVisitNumber(visit: RegistrationVisitResponse): string {
  const formatted = visit.visit_id?.trim();
  if (formatted) return formatted;
  return `VIS-${shortId(visit.id)}`;
}

function normalizeGender(value: string | null | undefined): OpdPatientVisitRow['gender'] {
  const g = value?.trim().toLowerCase();
  if (g === 'male' || g === 'm') return 'male';
  if (g === 'female' || g === 'f') return 'female';
  return 'other';
}

/** One registration.visit row for doctor or nurse patient queues. */
export function mapRegistrationVisitToOpdPatientRow(
  visit: RegistrationVisitResponse,
  empi: EmpiPatient | undefined,
  prescriptionStatus?: OpdPrescriptionStatus | null,
  opdVisitStatus?: string | null,
): OpdPatientVisitRow {
  const status = effectiveOpdQueueStatus(visit.status, prescriptionStatus, opdVisitStatus);

  return {
    id: visit.id,
    visitNumber: formatVisitNumber(visit),
    patientId: visit.patient_id,
    patientName: empi?.full_name?.trim() || '—',
    age: empi ? empiPatientAgeYears(empi) : 0,
    gender: normalizeGender(empi?.gender),
    doctorName: '—',
    doctorId: visit.doctor_id?.trim() ?? '',
    visitCreatedAt: visit.created_at.slice(0, 10),
    status,
    isOwnPatient: true,
    actionLabel: opdVisitStatusToActionLabel(status),
  };
}
