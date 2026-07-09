import type { QueueProjectionRow } from "../domain/pharmacy.types.js";

const DEFAULT_TENANT = "00000000-0000-0000-0000-000000000001";

export function mockQueueProjectionRow(
  overrides: Partial<QueueProjectionRow> = {},
): QueueProjectionRow {
  const encounterId =
    overrides.encounter_id ?? "00000000-0000-0000-0000-0000000000bb";
  const prescriptionId =
    overrides.prescription_id ?? overrides.source_ref_id ?? `rx-${encounterId}`;

  return {
    queue_item_id: "11111111-1111-4111-8111-111111111111",
    iq_tenant_id: DEFAULT_TENANT,
    source_kind: "opd",
    source_ref_id: prescriptionId,
    encounter_id: encounterId,
    patient_id: "patient-1",
    prescription_id: prescriptionId,
    doctor_id: "doctor-1",
    visit_status: "completed",
    prescription_status: "final",
    medicine_count: 2,
    priority: "routine",
    queued_at: new Date("2026-06-01T12:00:00.000Z"),
    patient_name: "Jane Doe",
    uhid: "UHID-001",
    phone: null,
    age_years: 30,
    gender: "male",
    doctor_name: "Dr. Demo",
    formatted_visit_id: null,
    dispense_status: "pending",
    context_json: {},
    last_synced_at: new Date("2026-06-01T12:00:00.000Z"),
    ...overrides,
  };
}
