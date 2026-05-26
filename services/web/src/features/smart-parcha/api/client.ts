import { apiClient } from '@/lib/api-client';
import type { FullContextResponse } from '../types';

const BASE = '/api/v1/smart-parcha';

type ApiEnvelope<T> = { success: boolean; data: T };

export async function fetchFullContext(
  visitId: string,
  addendum = true,
): Promise<FullContextResponse> {
  const q = addendum ? '?addendum=true' : '';
  const res = await apiClient<ApiEnvelope<FullContextResponse>>(
    `${BASE}/visits/${visitId}/full-context${q}`,
  );
  return res.data;
}

export async function saveAndIngest(
  visitId: string,
  payload: {
    parchaContent: { pageNumber: number; content: string }[];
    frame?: string;
    doctorId: string;
    patientId: string;
  },
) {
  const res = await apiClient<ApiEnvelope<unknown>>(`${BASE}/${visitId}/save-and-ingest`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
  return res.data;
}

export async function savePrescription(
  visitId: string,
  prescription: Record<string, unknown>,
  immunizations?: unknown[],
) {
  return apiClient<ApiEnvelope<unknown>>(`${BASE}/visits/${visitId}/save-prescription`, {
    method: 'POST',
    body: JSON.stringify({ prescription, immunizations }),
  });
}

export async function endConsultation(
  visitId: string,
  body: Record<string, unknown>,
) {
  return apiClient<ApiEnvelope<unknown>>(`${BASE}/visits/${visitId}/end-consultation`, {
    method: 'POST',
    body: JSON.stringify(body),
  });
}
