import { apiClient } from '@/lib/api-client';

const OPD_PREFIX = '/api/v1/opd';

export interface OpdPatientEncounterApi {
  patient_id: string;
  visit_id: string;
  visit_status: string;
  prescription_status: string | null;
  updated_at: string;
  created_at: string;
}

export interface OpdPatientListApiResponse {
  items: OpdPatientEncounterApi[];
  total: number;
  page: number;
  limit: number;
}

function toOpdStatusQuery(status: string): string | undefined {
  if (!status) return undefined;
  if (status === 'in-progress') return 'in_progress';
  if (status === 'pre-consulted') return 'pre_consulted';
  return status;
}

/** Patients queue for the active tenant — sourced from OPD visits/prescriptions. */
export async function searchOpdModulePatients(
  page: number,
  limit: number,
  statusFilter = '',
): Promise<OpdPatientListApiResponse> {
  const search = new URLSearchParams({
    page: String(page),
    limit: String(limit),
  });
  const status = toOpdStatusQuery(statusFilter);
  if (status) {
    search.set('status', status);
  }

  return apiClient<OpdPatientListApiResponse>(`${OPD_PREFIX}/patients?${search.toString()}`);
}
