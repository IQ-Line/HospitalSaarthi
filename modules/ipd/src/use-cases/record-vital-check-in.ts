import { randomUUID } from "node:crypto";
import type { EpisodeRepo } from "../domain/episode.js";
import type {
  MeasurementVitalCode,
  RecorderRole,
  VitalCheckIn,
  VitalSignRepo,
} from "../domain/vital-sign.js";
import {
  groupVitalCheckIns,
  MEASUREMENT_VITAL_DEFS,
  filterCheckInsByRole,
} from "../domain/vital-sign.js";

export type RecordVitalCheckInInput = {
  recorded_at?: string;
  recorder_role: RecorderRole;
  notes?: string | null;
  heart_rate?: number | null;
  systolic_bp?: number | null;
  diastolic_bp?: number | null;
  temperature?: number | null;
  spo2?: number | null;
  respiratory_rate?: number | null;
};

type Deps = {
  episodeRepo: EpisodeRepo;
  vitalSignRepo: VitalSignRepo;
};

function hasAnyMeasurement(input: RecordVitalCheckInInput): boolean {
  return [
    input.heart_rate,
    input.systolic_bp,
    input.diastolic_bp,
    input.temperature,
    input.spo2,
    input.respiratory_rate,
  ].some((v) => v != null && !Number.isNaN(v));
}

export async function recordVitalCheckIn(
  deps: Deps,
  tenantId: string,
  episodeId: string,
  recordedBy: string,
  input: RecordVitalCheckInInput,
): Promise<VitalCheckIn | null | "empty"> {
  if (!hasAnyMeasurement(input)) return "empty";

  const episode = await deps.episodeRepo.getById(tenantId, episodeId);
  if (!episode) return null;

  const checkInId = randomUUID();
  const recordedAt = input.recorded_at ?? new Date().toISOString();
  const ts = new Date().toISOString();
  const rows = [];

  for (const code of Object.keys(MEASUREMENT_VITAL_DEFS) as MeasurementVitalCode[]) {
    const value = input[code];
    if (value == null || Number.isNaN(value)) continue;
    const def = MEASUREMENT_VITAL_DEFS[code];
    rows.push({
      id: randomUUID(),
      iq_tenant_id: tenantId,
      episode_id: episodeId,
      check_in_id: checkInId,
      recorded_at: recordedAt,
      vital_code: code,
      vital_name: def.vital_name,
      data_type: def.data_type,
      value_numeric: String(value),
      value_text: null,
      unit: def.unit,
      recorded_by: recordedBy,
      notes: null,
      created_at: ts,
      updated_at: ts,
    });
  }

  rows.push({
    id: randomUUID(),
    iq_tenant_id: tenantId,
    episode_id: episodeId,
    check_in_id: checkInId,
    recorded_at: recordedAt,
    vital_code: "recorder_role" as const,
    vital_name: "Recorder Role",
    data_type: "text" as const,
    value_numeric: null,
    value_text: input.recorder_role,
    unit: null,
    recorded_by: recordedBy,
    notes: null,
    created_at: ts,
    updated_at: ts,
  });

  if (input.notes?.trim()) {
    rows.push({
      id: randomUUID(),
      iq_tenant_id: tenantId,
      episode_id: episodeId,
      check_in_id: checkInId,
      recorded_at: recordedAt,
      vital_code: "round_notes" as const,
      vital_name: "Notes",
      data_type: "text" as const,
      value_numeric: null,
      value_text: input.notes.trim(),
      unit: null,
      recorded_by: recordedBy,
      notes: null,
      created_at: ts,
      updated_at: ts,
    });
  }

  await deps.vitalSignRepo.insertMany(rows);
  const [checkIn] = groupVitalCheckIns(rows);
  return checkIn ?? null;
}

export async function listVitalCheckIns(
  deps: Deps,
  tenantId: string,
  episodeId: string,
  recorderRole?: RecorderRole,
): Promise<VitalCheckIn[] | null> {
  const episode = await deps.episodeRepo.getById(tenantId, episodeId);
  if (!episode) return null;

  const rows = await deps.vitalSignRepo.listByEpisode(tenantId, episodeId, {
    recorder_role: recorderRole,
  });
  const grouped = groupVitalCheckIns(rows);
  return filterCheckInsByRole(grouped, recorderRole);
}
