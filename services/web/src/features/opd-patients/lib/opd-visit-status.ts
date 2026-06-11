import type { OpdVisitSummary } from '@/features/create-rx/api/opd-prescription';
import type { OpdPatientVisitRow, OpdVisitStatus } from '../types';

export function opdVisitStatusToActionLabel(
  status: OpdVisitStatus,
): OpdPatientVisitRow['actionLabel'] {
  if (status === 'completed') return 'View RX';
  if (status === 'in-progress' || status === 'pre-consulted') return 'Edit RX';
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
    actionLabel: opdVisitStatusToActionLabel(status),
  };
}
