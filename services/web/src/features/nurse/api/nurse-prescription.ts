import { apiClient } from '@/lib/api-client';
import type { CreateRxFormData } from '@/features/create-rx/types';
import {
  fetchOpdPrescriptionSession,
  type OpdPrescriptionSession,
} from '@/features/create-rx/api/opd-prescription';
import { sanitizeCreateRxFormDataForPersist } from '@/features/create-rx/lib/form-data-session';

const OPD_PREFIX = '/api/v1/opd';

interface OpdPrescriptionApiResponse {
  prescription_id: string;
  visit_id: string;
  patient_id: string;
  visit_status: string;
  prescription_status: 'draft' | 'final' | 'cancelled';
  is_read_only: boolean;
  form_data: CreateRxFormData;
}

function apiResponseToSession(response: OpdPrescriptionApiResponse): OpdPrescriptionSession {
  return {
    prescription_id: response.prescription_id,
    visit_id: response.visit_id,
    patient_id: response.patient_id,
    prescription_status: response.prescription_status,
    is_read_only: response.is_read_only,
    form_data: response.form_data ?? ({} as CreateRxFormData),
  };
}

export async function saveNursePreConsult(
  visitId: string,
  formData: CreateRxFormData,
): Promise<OpdPrescriptionSession> {
  const visitKey = visitId.trim();
  if (!visitKey) {
    throw new Error('Visit id is required');
  }

  const response = await apiClient<OpdPrescriptionApiResponse>(
    `${OPD_PREFIX}/visits/${encodeURIComponent(visitKey)}/prescription/pre-consult`,
    {
      method: 'PUT',
      body: JSON.stringify({ form_data: sanitizeCreateRxFormDataForPersist(formData) }),
    },
  );
  return apiResponseToSession(response);
}

export { fetchOpdPrescriptionSession };
