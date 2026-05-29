import { getMockOpdPatientDetails } from '../mock/opd-patient-details.mock';
import { opdPatientsUseMock } from './opd-patients';
import type { OpdPatientDetails, OpdPatientVisitRow } from '../types';

export async function fetchOpdPatientDetails(row: OpdPatientVisitRow): Promise<OpdPatientDetails> {
  if (opdPatientsUseMock()) {
    await new Promise((r) => setTimeout(r, 40));
    return getMockOpdPatientDetails(row);
  }
  throw new Error(
    'OPD patient details API is not available. Use mock mode or wire patient profile endpoint.',
  );
}
