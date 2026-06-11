import { describe, expect, it } from "vitest";
import {
  formatDispensePatientHeader,
  formatDispenseVisitLabel,
  patientSummaryFromQueueProjection,
} from "./dispense-patient-display.js";

describe("dispense-patient-display", () => {
  it("formats patient header from queue projection summary", () => {
    const summary = patientSummaryFromQueueProjection({
      visit_id: "visit-1",
      iq_tenant_id: "tenant-1",
      patient_id: "patient-1",
      prescription_id: "rx-1",
      doctor_id: null,
      visit_status: "completed",
      prescription_status: "final",
      medicine_count: 1,
      queued_at: new Date("2026-06-01T12:00:00.000Z"),
      patient_name: "Deepa Patient18",
      uhid: "260609000010000019",
      phone: null,
      age_years: 37,
      gender: "female",
      doctor_name: "demo doctor",
      formatted_visit_id: "OP2606090000019",
      dispense_status: "pending",
      last_synced_at: new Date("2026-06-01T12:00:00.000Z"),
    });

    expect(formatDispensePatientHeader(summary, "patient-1")).toBe(
      "Deepa Patient18 · 260609000010000019 · 37y · Female",
    );
    expect(formatDispenseVisitLabel("78e446da-0000-4000-8000-000000000000", summary.formatted_visit_id)).toBe(
      "OP2606090000019",
    );
  });

  it("falls back when projection summary is empty", () => {
    const summary = patientSummaryFromQueueProjection(null);
    expect(formatDispensePatientHeader(summary, "72bfc5dc-fb92-4cbe-8dc6-3c4a3eb4aaf0")).toBe(
      "Patient 72bfc5dc…",
    );
    expect(formatDispenseVisitLabel("78e446da-0000-4000-8000-000000000000", null)).toBe("78E446DA");
  });
});
