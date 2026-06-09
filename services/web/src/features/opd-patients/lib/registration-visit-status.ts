import type { OpdPrescriptionStatus } from '@/features/create-rx/api/opd-prescription-types';
import type { OpdVisitStatus } from '../types';

function normalizeVisitStatusToken(status: string): string {
  return status.trim().toLowerCase().replace(/-/g, '_');
}

/** Map OPD ``opd.visits.status`` to doctor/nurse queue UI status. */
export function opdVisitStatusToOpdUi(status: string): OpdVisitStatus | null {
  const normalized = normalizeVisitStatusToken(status);
  if (normalized === 'pre_consulted') return 'pre-consulted';
  if (normalized === 'in_progress') return 'in-progress';
  if (normalized === 'cancelled') return 'cancelled';
  if (normalized === 'completed') return 'completed';
  if (normalized === 'registered') return 'registered';
  return null;
}

/** Map registration.visit.status to doctor/nurse queue UI status. */
export function registrationVisitStatusToOpdUi(status: string): OpdVisitStatus {
  const normalized = status.trim().toLowerCase().replace(/-/g, '_');
  if (normalized === 'cancelled') return 'cancelled';
  if (normalized === 'in_progress') return 'in-progress';
  if (normalized === 'completed') return 'completed';
  if (normalized === 'pending') return 'registered';
  return 'registered';
}

/**
 * Queue status from registration.visit plus OPD visit/prescription overlay.
 * Nurse pre-consult updates ``opd.visits.status`` to ``pre_consulted`` (registration stays pending/completed).
 */
export function effectiveOpdQueueStatus(
  registrationStatus: string,
  prescriptionStatus: OpdPrescriptionStatus | null | undefined,
  opdVisitStatus?: string | null,
): OpdVisitStatus {
  const rxStatus = prescriptionStatus ?? undefined;
  if (rxStatus === 'final') return 'completed';
  if (rxStatus === 'cancelled') return 'cancelled';

  const opdUi = opdVisitStatus ? opdVisitStatusToOpdUi(opdVisitStatus) : null;
  if (opdUi === 'pre-consulted' || opdUi === 'in-progress') {
    return opdUi;
  }

  const normalized = normalizeVisitStatusToken(registrationStatus);
  if (normalized === 'completed') return 'registered';
  return registrationVisitStatusToOpdUi(registrationStatus);
}

/** UI status filter → registration.visit.status query param. */
export function opdUiStatusToRegistrationVisitQuery(status: string): string | undefined {
  if (!status) return undefined;
  if (status === 'in-progress') return 'in_progress';
  if (status === 'registered' || status === 'pre-consulted') return 'pending';
  if (status === 'completed' || status === 'cancelled') return status;
  return undefined;
}
