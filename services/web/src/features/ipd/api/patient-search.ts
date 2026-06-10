import {
  searchEmpiPatients,
  type EmpiPatient,
} from '@/features/opd-patients/api/empi-patients';
import { ipdUseMock } from './admissions';
import { searchMockIpdPatients } from '../mock/patients';

export type { EmpiPatient };

/** IPD-owned wrapper — decouples patient search from OPD feature mock env. */
export async function searchIpdPatients(query: string, page = 1, limit = 8) {
  if (ipdUseMock()) {
    await new Promise((r) => setTimeout(r, 80));
    return searchMockIpdPatients(query, page, limit);
  }
  return searchEmpiPatients(
    {
      search: query,
      status: '',
      gender: '',
      ageGroup: '',
      visitType: '',
      startDate: '',
      endDate: '',
      doctorId: '',
    },
    page,
    limit,
  );
}
