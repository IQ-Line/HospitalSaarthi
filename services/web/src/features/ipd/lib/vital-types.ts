export type RecorderRole = 'nurse' | 'doctor' | 'resident' | 'consultant';

export type VitalCheckIn = {
  check_in_id: string;
  episode_id: string;
  recorded_at: string;
  recorded_by: string;
  recorder_role: RecorderRole | null;
  notes: string | null;
  heart_rate: number | null;
  systolic_bp: number | null;
  diastolic_bp: number | null;
  temperature: number | null;
  spo2: number | null;
  respiratory_rate: number | null;
};

export type RecordVitalCheckInInput = {
  recorder_role: RecorderRole;
  notes?: string | null;
  heart_rate?: number | null;
  systolic_bp?: number | null;
  diastolic_bp?: number | null;
  temperature?: number | null;
  spo2?: number | null;
  respiratory_rate?: number | null;
};

export function formatVitalValue(value: number | null): string {
  return value == null ? '—' : String(value);
}

export function formatBloodPressure(
  systolic: number | null,
  diastolic: number | null,
): string {
  if (systolic == null && diastolic == null) return '—';
  return `${systolic ?? '—'}/${diastolic ?? '—'}`;
}

export function formatVitalRecordedAt(iso: string): string {
  return new Date(iso).toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function parseOptionalNumber(value: string): number | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const n = Number(trimmed);
  return Number.isFinite(n) ? n : null;
}

export function formToRecordInput(form: {
  heartRate: string;
  systolicBp: string;
  diastolicBp: string;
  temperature: string;
  spo2: string;
  respiratoryRate: string;
  recordedBy: RecorderRole;
  notes: string;
}): RecordVitalCheckInInput {
  return {
    recorder_role: form.recordedBy,
    notes: form.notes.trim() || null,
    heart_rate: parseOptionalNumber(form.heartRate),
    systolic_bp: parseOptionalNumber(form.systolicBp),
    diastolic_bp: parseOptionalNumber(form.diastolicBp),
    temperature: parseOptionalNumber(form.temperature),
    spo2: parseOptionalNumber(form.spo2),
    respiratory_rate: parseOptionalNumber(form.respiratoryRate),
  };
}

export function hasAnyVitalMeasurement(input: RecordVitalCheckInInput): boolean {
  return [
    input.heart_rate,
    input.systolic_bp,
    input.diastolic_bp,
    input.temperature,
    input.spo2,
    input.respiratory_rate,
  ].some((v) => v != null);
}
