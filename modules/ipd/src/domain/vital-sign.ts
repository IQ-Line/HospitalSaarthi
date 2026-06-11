export type VitalDataType = "numeric" | "text" | "boolean" | "score";

export type MeasurementVitalCode =
  | "heart_rate"
  | "systolic_bp"
  | "diastolic_bp"
  | "temperature"
  | "spo2"
  | "respiratory_rate";

export type MetaVitalCode = "recorder_role" | "round_notes";

export type VitalCode = MeasurementVitalCode | MetaVitalCode;

export type RecorderRole = "nurse" | "doctor" | "resident" | "consultant";

export interface VitalSignRow {
  id: string;
  iq_tenant_id: string;
  episode_id: string;
  check_in_id: string;
  recorded_at: string;
  vital_code: VitalCode;
  vital_name: string;
  data_type: VitalDataType;
  value_numeric: string | null;
  value_text: string | null;
  unit: string | null;
  recorded_by: string;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface VitalCheckIn {
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
}

export interface VitalCheckInListQuery {
  recorder_role?: RecorderRole;
}

export interface VitalSignRepo {
  listByEpisode(
    tenantId: string,
    episodeId: string,
    query?: VitalCheckInListQuery,
  ): Promise<VitalSignRow[]>;
  insertMany(rows: VitalSignRow[]): Promise<VitalSignRow[]>;
}

export const MEASUREMENT_VITAL_DEFS: Record<
  MeasurementVitalCode,
  { vital_name: string; unit: string | null; data_type: "numeric" }
> = {
  heart_rate: { vital_name: "Heart Rate", unit: "bpm", data_type: "numeric" },
  systolic_bp: { vital_name: "Systolic BP", unit: "mmHg", data_type: "numeric" },
  diastolic_bp: { vital_name: "Diastolic BP", unit: "mmHg", data_type: "numeric" },
  temperature: { vital_name: "Temperature", unit: "°C", data_type: "numeric" },
  spo2: { vital_name: "SpO2", unit: "%", data_type: "numeric" },
  respiratory_rate: { vital_name: "Respiratory Rate", unit: null, data_type: "numeric" },
};

function parseNumeric(value: string | null): number | null {
  if (value == null || value.trim() === "") return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

export function groupVitalCheckIns(rows: VitalSignRow[]): VitalCheckIn[] {
  const byCheckIn = new Map<string, VitalSignRow[]>();
  for (const row of rows) {
    const group = byCheckIn.get(row.check_in_id) ?? [];
    group.push(row);
    byCheckIn.set(row.check_in_id, group);
  }

  const checkIns: VitalCheckIn[] = [];
  for (const [checkInId, group] of byCheckIn) {
    const first = group[0];
    if (!first) continue;

    const checkIn: VitalCheckIn = {
      check_in_id: checkInId,
      episode_id: first.episode_id,
      recorded_at: first.recorded_at,
      recorded_by: first.recorded_by,
      recorder_role: null,
      notes: null,
      heart_rate: null,
      systolic_bp: null,
      diastolic_bp: null,
      temperature: null,
      spo2: null,
      respiratory_rate: null,
    };

    for (const row of group) {
      if (row.vital_code === "recorder_role") {
        checkIn.recorder_role = (row.value_text ?? null) as RecorderRole | null;
        continue;
      }
      if (row.vital_code === "round_notes") {
        checkIn.notes = row.value_text ?? null;
        continue;
      }
      if (row.vital_code in MEASUREMENT_VITAL_DEFS) {
        const code = row.vital_code as MeasurementVitalCode;
        checkIn[code] = parseNumeric(row.value_numeric);
      }
    }

    checkIns.push(checkIn);
  }

  return checkIns.sort((a, b) => b.recorded_at.localeCompare(a.recorded_at));
}

export function filterCheckInsByRole(
  checkIns: VitalCheckIn[],
  role?: RecorderRole,
): VitalCheckIn[] {
  if (!role) return checkIns;
  return checkIns.filter((c) => c.recorder_role === role);
}

export function toVitalCheckInApi(checkIn: VitalCheckIn): VitalCheckIn {
  return checkIn;
}
