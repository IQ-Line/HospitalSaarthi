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
