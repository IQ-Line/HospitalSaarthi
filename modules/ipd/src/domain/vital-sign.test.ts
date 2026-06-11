import { describe, expect, it } from "vitest";
import { groupVitalCheckIns, type VitalSignRow } from "./vital-sign.js";

const baseRow = (overrides: Partial<VitalSignRow>): VitalSignRow => ({
  id: overrides.id ?? crypto.randomUUID(),
  iq_tenant_id: "t-1",
  episode_id: "e-1",
  check_in_id: overrides.check_in_id ?? "c-1",
  recorded_at: overrides.recorded_at ?? "2026-06-10T08:00:00.000Z",
  vital_code: overrides.vital_code ?? "heart_rate",
  vital_name: overrides.vital_name ?? "Heart Rate",
  data_type: overrides.data_type ?? "numeric",
  value_numeric: overrides.value_numeric ?? "72",
  value_text: overrides.value_text ?? null,
  unit: overrides.unit ?? "bpm",
  recorded_by: overrides.recorded_by ?? "u-1",
  notes: overrides.notes ?? null,
  created_at: overrides.created_at ?? "2026-06-10T08:00:00.000Z",
  updated_at: overrides.updated_at ?? "2026-06-10T08:00:00.000Z",
});

describe("groupVitalCheckIns", () => {
  it("groups EAV rows into a check-in view", () => {
    const checkInId = "c-1";
    const grouped = groupVitalCheckIns([
      baseRow({ check_in_id: checkInId, vital_code: "heart_rate", value_numeric: "80" }),
      baseRow({ check_in_id: checkInId, vital_code: "systolic_bp", value_numeric: "120" }),
      baseRow({ check_in_id: checkInId, vital_code: "diastolic_bp", value_numeric: "80" }),
      baseRow({
        check_in_id: checkInId,
        vital_code: "recorder_role",
        data_type: "text",
        value_numeric: null,
        value_text: "nurse",
        vital_name: "Recorder Role",
      }),
      baseRow({
        check_in_id: checkInId,
        vital_code: "round_notes",
        data_type: "text",
        value_numeric: null,
        value_text: "Stable",
        vital_name: "Notes",
      }),
    ]);

    expect(grouped).toHaveLength(1);
    expect(grouped[0]?.heart_rate).toBe(80);
    expect(grouped[0]?.systolic_bp).toBe(120);
    expect(grouped[0]?.recorder_role).toBe("nurse");
    expect(grouped[0]?.notes).toBe("Stable");
  });
});
