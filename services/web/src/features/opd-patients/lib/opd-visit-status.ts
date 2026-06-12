import type { OpdVisitSummary } from '@/features/create-rx/api/opd-prescription';
import type { OpdPrescriptionStatus } from '@/features/create-rx/api/opd-prescription-types';
import type { OpdPatientVisitRow, OpdVisitStatus } from '../types';

/** Queue action: Edit RX only when a draft exists or nurse pre-consult is done. */
export function opdVisitStatusToActionLabel(
  status: OpdVisitStatus,
  prescriptionStatus?: OpdPrescriptionStatus | null,
): OpdPatientVisitRow['actionLabel'] {
  if (status === 'completed') return 'View RX';
  if (status === 'pre-consulted') return 'Edit RX';
  if (prescriptionStatus === 'draft') return 'Edit RX';
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
      ? 'in-progress'
      : summary.status === 'pre_consulted'
        ? 'pre-consulted'
        : (summary.status as OpdVisitStatus);
  return {
    ...row,
    status,
    actionLabel: opdVisitStatusToActionLabel(status, prescriptionStatus),
  };
}
