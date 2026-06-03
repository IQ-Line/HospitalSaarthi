import type { OpdPrescriptionSession } from '../api/opd-prescription';
import { prescriptionStatusToVisitStatus } from '../api/opd-prescription';
import type { CreateRxVisitContext } from '../types';

export function resolveCreateRxSession(
  ctx: CreateRxVisitContext,
  mode: 'edit' | 'view',
  prescription: OpdPrescriptionSession | null,
): {
  context: CreateRxVisitContext;
  isReadOnly: boolean;
  prescriptionId: string | null;
} {
  const visitStatus = prescription
    ? prescriptionStatusToVisitStatus(prescription.prescription_status)
    : ctx.visit.status;
  const normalizedStatus =
    visitStatus === 'in_progress' ? 'in-progress' : visitStatus;

  const isReadOnly =
    mode === 'view' ||
    prescription?.is_read_only === true ||
    prescription?.prescription_status === 'final';

  return {
    context: {
      ...ctx,
      visit: {
        ...ctx.visit,
        id: prescription?.visit_id ?? ctx.visit.id,
        status: normalizedStatus,
      },
    },
    isReadOnly,
    prescriptionId: prescription?.prescription_id ?? null,
  };
}
