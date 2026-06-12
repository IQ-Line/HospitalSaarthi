import { apiClient } from '@/lib/api-client';
import type { CreateRxFormData } from '@/features/create-rx/types';
import {
  fetchOpdPrescriptionSession,
  visitPrescriptionResponseToSession,
  type OpdPrescriptionSession,
  type OpdVisitPrescriptionResponse,
} from '@/features/create-rx/api/opd-prescription';
import { sanitizeCreateRxFormDataForPersist } from '@/features/create-rx/lib/form-data-session';

const OPD_PREFIX = '/api/v1/opd';

export async function saveNursePreConsult(
  visitId: string,
  formData: CreateRxFormData,
): Promise<OpdPrescriptionSession> {
  const visitKey = visitId.trim();
  if (!visitKey) {
    throw new Error('Visit id is required');
  }

  const response = await apiClient<OpdVisitPrescriptionResponse>(
    `${OPD_PREFIX}/visits/${encodeURIComponent(visitKey)}/prescription/pre-consult`,
    {
      method: 'PUT',
      body: JSON.stringify({ form_data: sanitizeCreateRxFormDataForPersist(formData) }),
    },
  );
  return visitPrescriptionResponseToSession(response);
}

export { fetchOpdPrescriptionSession };
