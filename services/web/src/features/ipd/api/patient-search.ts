import {
  searchEmpiPatients,
  type EmpiPatient,
} from '@/features/opd-patients/api/empi-patients';

export type { EmpiPatient };

/** IPD-owned wrapper — decouples patient search from OPD feature mock env. */
export async function searchIpdPatients(query: string, page = 1, limit = 8) {
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
