import type { OpdPrescriptionStatus } from '@/features/create-rx/api/opd-prescription-types';
import type { OpdVisitStatus } from '../types';

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
 * Queue status from registration.visit plus optional OPD prescription (mirrors OPD
 * `effective_visit_status`). Desk intake sets visit `completed` after billing — that is not
 * doctor consulted until prescription is `final`.
 */
export function effectiveOpdQueueStatus(
  registrationStatus: string,
  prescriptionStatus: OpdPrescriptionStatus | null | undefined,
): OpdVisitStatus {
  if (prescriptionStatus === 'final') return 'completed';
  if (prescriptionStatus === 'cancelled') return 'cancelled';
  const normalized = registrationStatus.trim().toLowerCase().replace(/-/g, '_');
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
