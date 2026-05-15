import { apiClient } from '@/lib/api-client';
import type { RegisterPatientResponse } from '../types';

/**
 * Browser → BFF `POST /api/empi/v1/patients` → EMPI.
 * Later, a dedicated BFF orchestration route may call EMPI + OPD; this path stays stable on EMPI.
 */
const EMPI_PATIENTS_PATH = '/api/empi/v1/patients';

export async function registerPatientThroughBff(
  body: Record<string, unknown>,
): Promise<RegisterPatientResponse> {
  return apiClient<RegisterPatientResponse>(EMPI_PATIENTS_PATH, {
    method: 'POST',
    body: JSON.stringify(body),
  });
}
