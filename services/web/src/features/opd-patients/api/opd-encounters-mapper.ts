import { empiPatientAgeYears, empiPatientCreatedDate, type EmpiPatient } from './empi-patients';
import type { OpdPatientEncounterApi } from './opd-module-patients';
import { opdVisitStatusToActionLabel } from '../lib/opd-visit-status';
import type { OpdPatientVisitRow, OpdVisitStatus } from '../types';

function mapEncounterStatus(
  visitStatus: string,
  prescriptionStatus: string | null,
): OpdVisitStatus {
  if (prescriptionStatus === 'final') return 'completed';
  if (prescriptionStatus === 'cancelled') return 'cancelled';
  // Registration intake/billing complete — not doctor consulted until rx is final.
  if (visitStatus === 'completed') return 'registered';
  if (visitStatus === 'cancelled') return 'cancelled';
  if (visitStatus === 'pre_consulted') return 'pre-consulted';
  if (visitStatus === 'in_progress') return 'in-progress';
  return 'registered';
}

export function mapOpdEncounterToVisitRow(
  encounter: OpdPatientEncounterApi,
  empi: EmpiPatient | undefined,
): OpdPatientVisitRow {
  const status = mapEncounterStatus(encounter.visit_status, encounter.prescription_status);

  return {
    id: encounter.visit_id,
    visitNumber: empi?.uhid ?? encounter.visit_id.slice(0, 8).toUpperCase(),
    patientId: encounter.patient_id,
    patientName: empi?.full_name ?? `Patient ${encounter.patient_id.slice(0, 8)}`,
    age: empi ? empiPatientAgeYears(empi) : 0,
    gender: empi?.gender ?? 'other',
    doctorName: '—',
    doctorId: '',
    visitCreatedAt: empi
      ? empiPatientCreatedDate(empi)
      : encounter.created_at.slice(0, 10),
    status,
    isOwnPatient: true,
    actionLabel: opdVisitStatusToActionLabel(status),
  };
}
