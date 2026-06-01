import { fetchEmpiPatientDetail, mapEmpiPatientToOpdDetails } from './empi-patients';
import { getMockOpdPatientDetails } from '../mock/opd-patient-details.mock';
import { opdPatientsUseMock } from './opd-patients';
import type { OpdPatientDetails, OpdPatientVisitRow } from '../types';

export async function fetchOpdPatientDetails(row: OpdPatientVisitRow): Promise<OpdPatientDetails> {
  if (opdPatientsUseMock()) {
    await new Promise((r) => setTimeout(r, 40));
    return getMockOpdPatientDetails(row);
  }

  const detail = await fetchEmpiPatientDetail(row.patientId);
  return mapEmpiPatientToOpdDetails(detail);
}
