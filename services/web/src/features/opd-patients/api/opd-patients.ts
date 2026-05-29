import { getMockOpdPatientsList } from '../mock/opd-patients.mock';
import type { OpdPatientsListParams, OpdPatientsListResponse } from '../types';

/** Dev UI without OPD list API — set `VITE_OPD_PATIENTS_USE_MOCK=false` when backend is wired. */
export function opdPatientsUseMock(): boolean {
  return (
    import.meta.env.VITE_OPD_PATIENTS_USE_MOCK === 'true' ||
    (import.meta.env.DEV && import.meta.env.VITE_OPD_PATIENTS_USE_MOCK !== 'false')
  );
}

export async function fetchOpdPatientsList(
  params: OpdPatientsListParams,
): Promise<OpdPatientsListResponse> {
  if (opdPatientsUseMock()) {
    await new Promise((r) => setTimeout(r, 120));
    return getMockOpdPatientsList(params);
  }
  throw new Error(
    'OPD patients API is not available. Set VITE_OPD_PATIENTS_USE_MOCK=true for development, or wire /api/opd/v1/patients before disabling mock mode.',
  );
}
