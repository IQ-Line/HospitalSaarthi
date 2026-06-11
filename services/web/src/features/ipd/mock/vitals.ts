import type { RecordVitalCheckInInput, VitalCheckIn } from '../lib/vital-types';

const DEV_RECORDED_BY = '00000000-0000-0000-0000-000000000001';

const store: VitalCheckIn[] = [];

export function listMockVitalCheckIns(
  admissionId: string,
  recorderRole?: string,
): VitalCheckIn[] {
  return store
    .filter(
      (row) =>
        row.episode_id === admissionId &&
        (recorderRole == null || recorderRole === 'all' || row.recorder_role === recorderRole),
    )
    .sort((a, b) => b.recorded_at.localeCompare(a.recorded_at));
}

export function recordMockVitalCheckIn(
  admissionId: string,
  input: RecordVitalCheckInInput,
): VitalCheckIn {
  const recordedAt = new Date().toISOString();
  const checkIn: VitalCheckIn = {
    check_in_id: crypto.randomUUID(),
    episode_id: admissionId,
    recorded_at: recordedAt,
    recorded_by: DEV_RECORDED_BY,
    recorder_role: input.recorder_role,
    notes: input.notes ?? null,
    heart_rate: input.heart_rate ?? null,
    systolic_bp: input.systolic_bp ?? null,
    diastolic_bp: input.diastolic_bp ?? null,
    temperature: input.temperature ?? null,
    spo2: input.spo2 ?? null,
    respiratory_rate: input.respiratory_rate ?? null,
  };
  store.unshift(checkIn);
  return checkIn;
}
