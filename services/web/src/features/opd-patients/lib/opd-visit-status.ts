import type { OpdVisitSummary } from '@/features/create-rx/api/opd-prescription';
import type { OpdPrescriptionStatus } from '@/features/create-rx/api/opd-prescription-types';
import type { OpdPatientVisitRow, OpdVisitStatus } from '../types';

/** Queue action: Edit RX when nurse pre-consult or doctor has saved consultation content. */
export function opdVisitStatusToActionLabel(
  status: OpdVisitStatus,
  _prescriptionStatus?: OpdPrescriptionStatus | null,
  opdVisitStatus?: string | null,
): OpdPatientVisitRow['actionLabel'] {
  if (status === 'completed') return 'View RX';

  const opdNorm = opdVisitStatus?.trim().toLowerCase().replace(/-/g, '_') ?? '';
  if (opdNorm === 'pre_consulted' || opdNorm === 'in_progress') {
    return 'Edit RX';
  }

  return 'Create Rx';
}

export function mapOpdVisitSummariesByPatientId(
  items: OpdVisitSummary[],
): Map<string, OpdVisitSummary> {
  const map = new Map<string, OpdVisitSummary>();
  for (const item of items) {
    const existing = map.get(item.patient_id);
    if (!existing || item.updated_at > existing.updated_at) {
      map.set(item.patient_id, item);
    }
  }
  return map;
}

export function applyOpdVisitSummaryOverlay(
  row: OpdPatientVisitRow,
  summary: OpdVisitSummary | undefined,
  prescriptionStatus?: OpdPrescriptionStatus | null,
): OpdPatientVisitRow {
  if (!summary) return row;
  const status: OpdVisitStatus =
    summary.status === 'in_progress'
      ? 'pre-consulted'
      : summary.status === 'pre_consulted'
        ? 'pre-consulted'
        : summary.status === 'registered'
          ? 'registered'
          : (summary.status as OpdVisitStatus);
  return {
    ...row,
    status,
    actionLabel: opdVisitStatusToActionLabel(status, prescriptionStatus, summary.status),
  };
}
