import { apiClient } from '@/lib/api-client';
import { ipdUseMock } from './admissions';
import type { RecordVitalCheckInInput, RecorderRole, VitalCheckIn } from '../lib/vital-types';
import { listMockVitalCheckIns, recordMockVitalCheckIn } from '../mock/vitals';

const IPD_PREFIX = '/api/ipd/v1';

type VitalCheckInListResponse = { data: VitalCheckIn[] };

export async function fetchVitalCheckIns(
  admissionId: string,
  recorderRole?: RecorderRole | 'all',
): Promise<VitalCheckIn[]> {
  if (ipdUseMock()) {
    await new Promise((r) => setTimeout(r, 80));
    return listMockVitalCheckIns(admissionId, recorderRole);
  }
  const params = new URLSearchParams();
  if (recorderRole && recorderRole !== 'all') {
    params.set('recorder_role', recorderRole);
  }
  const qs = params.toString();
  const res = await apiClient<VitalCheckInListResponse>(
    `${IPD_PREFIX}/admissions/${admissionId}/vital-check-ins${qs ? `?${qs}` : ''}`,
  );
  return res.data;
}

export async function recordVitalCheckIn(
  admissionId: string,
  input: RecordVitalCheckInInput,
): Promise<VitalCheckIn> {
  if (ipdUseMock()) {
    await new Promise((r) => setTimeout(r, 100));
    return recordMockVitalCheckIn(admissionId, input);
  }
  return apiClient<VitalCheckIn>(
    `${IPD_PREFIX}/admissions/${admissionId}/vital-check-ins`,
    {
      method: 'POST',
      body: JSON.stringify(input),
    },
  );
}
