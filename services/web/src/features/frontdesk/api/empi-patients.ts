import { apiClient } from '@/lib/api-client';
import { visitRegistrationEmpiPhone } from '@/features/frontdesk/utils/visit-registration-helpers';

const EMPI_V1 = '/api/empi/v1';

export interface EmpiPatientSummary {
  id: string;
  uhid: string;
  full_name: string;
  phone_number: string;
  status?: string;
}

export interface EmpiPatientSearchPage {
  data: EmpiPatientSummary[];
  total: number;
  page?: number;
  limit?: number;
  total_pages?: number;
}

async function searchPatientsByPhoneExact(phone: string): Promise<EmpiPatientSearchPage> {
  const sp = new URLSearchParams({ phone, limit: '1', page: '1' });
  return apiClient<EmpiPatientSearchPage>(`${EMPI_V1}/patients?${sp.toString()}`);
}

/**
 * Lookup whether a desk phone belongs to an existing EMPI patient.
 * Tries E.164 `+91` first, then raw 10-digit (legacy rows).
 */
export async function searchEmpiPatientByDeskPhone(phone10: string): Promise<EmpiPatientSearchPage> {
  const e164 = visitRegistrationEmpiPhone(phone10);
  const primary = await searchPatientsByPhoneExact(e164);
  if (primary.total > 0) return primary;
  if (phone10 === e164) return primary;
  return searchPatientsByPhoneExact(phone10);
}
