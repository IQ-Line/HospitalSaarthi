import type { RegistrationListItemResponse } from '@/features/frontdesk/types';
import type { OpdVisitSummary } from '@/features/create-rx/api/opd-prescription';
import {
  applyOpdVisitSummaryOverlay,
  opdVisitStatusToActionLabel,
} from '../lib/opd-visit-status';
import type { OpdPatientVisitRow } from '../types';

function shortId(uuid: string): string {
  return uuid.replace(/-/g, '').slice(0, 8).toUpperCase();
}

function normalizeGender(value: string | null | undefined): OpdPatientVisitRow['gender'] {
  const g = value?.trim().toLowerCase();
  if (g === 'male' || g === 'm') return 'male';
  if (g === 'female' || g === 'f') return 'female';
  return 'other';
}

export function ageFromRegistrationSnapshot(reg: RegistrationListItemResponse): number {
  if (reg.patient_date_of_birth) {
    const dob = new Date(reg.patient_date_of_birth);
    if (!Number.isNaN(dob.getTime())) {
      const today = new Date();
      let age = today.getFullYear() - dob.getFullYear();
      const monthDelta = today.getMonth() - dob.getMonth();
      if (monthDelta < 0 || (monthDelta === 0 && today.getDate() < dob.getDate())) {
        age -= 1;
      }
      return Math.max(0, age);
    }
  }
  if (reg.patient_year_of_birth != null) {
    return Math.max(0, new Date().getFullYear() - reg.patient_year_of_birth);
  }
  return 0;
}

function formatVisitNumber(reg: RegistrationListItemResponse): string {
  const visitId = reg.visit_id?.trim();
  if (visitId) return `VIS-${shortId(visitId)}`;
  const uhid = reg.patient_uhid?.trim();
  if (uhid) return uhid;
  return `REG-${shortId(reg.registration_id)}`;
}

/** One registration row for the doctor queue, with optional OPD encounter overlay. */
export function mapRegistrationToOpdPatientRow(
  reg: RegistrationListItemResponse,
  opdVisit: OpdVisitSummary | undefined,
): OpdPatientVisitRow {
  let row: OpdPatientVisitRow = {
    id: opdVisit?.visit_id ?? reg.patient_id,
    visitNumber: formatVisitNumber(reg),
    patientId: reg.patient_id,
    patientName: reg.patient_full_name?.trim() || '—',
    age: ageFromRegistrationSnapshot(reg),
    gender: normalizeGender(reg.patient_gender),
    doctorName: '—',
    doctorId: reg.provider_id?.trim() ?? '',
    visitCreatedAt: reg.created_at.slice(0, 10),
    status: 'registered',
    isOwnPatient: true,
    actionLabel: 'Start RX',
  };

  if (opdVisit) {
    row = applyOpdVisitSummaryOverlay(row, opdVisit);
    row.id = opdVisit.visit_id;
  }

  if (reg.registration_status === 'cancelled') {
    row.status = 'cancelled';
    row.actionLabel = opdVisitStatusToActionLabel('cancelled');
  }

  return row;
}
