import { describe, expect, it } from "vitest";
import { clinicalSummaryFromFormData, formatVitalsSummary } from "../../../src/lib/opd-clinical-summary.js";

describe("opd-clinical-summary", () => {
  it("formats vitals for sidebar display", () => {
    expect(
      formatVitalsSummary({
        temperature: "36.9",
        height: "170",
        weight: "72",
        pulse_rate: "78",
      }),
    ).toBe("Temp: 98.4°F · Ht: 170 cm · Wt: 72 kg · Pulse: 78");
  });

  it("extracts complaints and diagnosis from Create RX form_data", () => {
    const summary = clinicalSummaryFromFormData({
      vitals: { systolic_bp: "120", diastolic_bp: "80", pulse_rate: "72" },
      chiefComplaints: [
        { complaint: "Chest discomfort" },
        { complaint: "mild headache" },
      ],
      diagnosis: [{ notes: "Hypertension — controlled", certainty: "confirmed" }],
    });

    expect(summary.vitals_summary).toBe("Pulse: 72 · BP: 120/80");
    expect(summary.complaints_summary).toBe("Chest discomfort, mild headache");
    expect(summary.diagnosis_summary).toBe("Hypertension — controlled — confirmed");
  });
});
