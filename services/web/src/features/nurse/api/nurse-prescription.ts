import type { CreateRxFormData } from '@/features/create-rx/types';
import {
  fetchOpdPrescriptionSession,
  saveOpdPrescriptionDraft,
  type OpdPrescriptionSession,
} from '@/features/create-rx/api/opd-prescription';

/**
 * Nurse pre-consult = save the registration visit's draft prescription on the
 * normalized `/prescriptions` family. This is the same operation as the doctor's
 * draft save; the nurse simply has no prescription id yet, so it is fetched-or-created
 * from the registration `visitId` + the EMPI `patientId`. The clinical mapper
 * (`createRxFormDataToClinical`) sanitizes the form, so no pre-sanitize is needed here.
 */
export async function saveNursePreConsult(
  visitId: string,
  patientId: string,
  formData: CreateRxFormData,
): Promise<OpdPrescriptionSession> {
  return saveOpdPrescriptionDraft(visitId, patientId, formData, null);
}

export { fetchOpdPrescriptionSession };
