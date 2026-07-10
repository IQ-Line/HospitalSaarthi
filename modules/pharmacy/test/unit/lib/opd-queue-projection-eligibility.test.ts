import { describe, expect, it } from "vitest";
import {
  isEligibleOpdQueueProjectionRow,
  resolveOpdQueueQueuedAt,
} from "../../../src/lib/opd-queue-projection-eligibility.js";
import type { OpdCompletedVisitSummary } from "../../../src/domain/pharmacy.types.js";

function visit(overrides: Partial<OpdCompletedVisitSummary> = {}): OpdCompletedVisitSummary {
  return {
    visit_id: "visit-1",
    patient_id: "patient-1",
    prescription_id: "rx-1",
    doctor_id: "doctor-1",
    visit_status: "completed",
    prescription_status: "final",
    updated_at: "2026-06-01T12:00:00.000Z",
    finalized_at: "2026-06-01T12:00:00.000Z",
    medicine_count: 2,
    ...overrides,
  };
}

describe("isEligibleOpdQueueProjectionRow", () => {
  it("accepts completed final prescriptions with medicines", () => {
    expect(isEligibleOpdQueueProjectionRow(visit())).toBe(true);
  });

  it("rejects draft or in-progress visits", () => {
    expect(isEligibleOpdQueueProjectionRow(visit({ visit_status: "in_progress" }))).toBe(false);
    expect(isEligibleOpdQueueProjectionRow(visit({ prescription_status: "draft" }))).toBe(false);
  });

  it("rejects visits without medicines or prescription id", () => {
    expect(isEligibleOpdQueueProjectionRow(visit({ medicine_count: 0 }))).toBe(false);
    expect(isEligibleOpdQueueProjectionRow(visit({ prescription_id: null }))).toBe(false);
  });
});

describe("resolveOpdQueueQueuedAt", () => {
  it("prefers finalized_at over updated_at", () => {
    const queuedAt = resolveOpdQueueQueuedAt(
      visit({
        finalized_at: "2026-06-02T08:00:00.000Z",
        updated_at: "2026-06-01T12:00:00.000Z",
      }),
    );
    expect(queuedAt.toISOString()).toBe("2026-06-02T08:00:00.000Z");
  });
});
