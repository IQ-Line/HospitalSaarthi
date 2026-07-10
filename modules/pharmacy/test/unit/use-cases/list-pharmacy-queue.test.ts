import { describe, expect, it, vi } from "vitest";
import type { QueueProjectionRow } from "../../../src/domain/pharmacy.types.js";
import type { QueueProjectionRepo } from "../../../src/ports.js";
import { mockQueueProjectionRow } from "../../../src/test-fixtures/queue-projection.js";
import { listPharmacyQueue } from "../../../src/use-cases/list-pharmacy-queue.js";

const TENANT = "00000000-0000-0000-0000-000000000001";

function projectionRow(visitId: string, patientId: string, queuedAt: string): QueueProjectionRow {
  return mockQueueProjectionRow({
    encounter_id: visitId,
    patient_id: patientId,
    source_ref_id: `rx-${visitId}`,
    prescription_id: `rx-${visitId}`,
    queued_at: new Date(queuedAt),
    last_synced_at: new Date(queuedAt),
    patient_name: patientId === "patient-a" ? "Alice" : "Bob",
    uhid: `UHID-${patientId}`,
    doctor_name: "Dr. Demo DoctorOne",
  });
}

function queueProjectionRepo(
  listResult: { items: QueueProjectionRow[]; total: number },
): QueueProjectionRepo {
  return {
    listForQueue: vi.fn(async () => listResult),
    upsert: vi.fn(),
    updateDispenseStatus: vi.fn(),
    deleteByEncounterId: vi.fn(),
    deleteByVisitId: vi.fn(),
    findByEncounterId: vi.fn(),
    findByVisitId: vi.fn(),
  };
}

function baseDeps(projection: QueueProjectionRepo) {
  return {
    queueProjectionRepo: projection,
  };
}

describe("listPharmacyQueue", () => {
  it("lists OPD rows from projection", async () => {
    const projection = queueProjectionRepo({
      total: 1,
      items: [projectionRow("visit-a", "patient-a", "2026-06-01T12:00:00.000Z")],
    });
    const deps = baseDeps(projection);

    const result = await listPharmacyQueue(deps, TENANT, {
      page: 1,
      limit: 10,
      status: "pending",
    });

    expect(projection.listForQueue).toHaveBeenCalledWith(TENANT, {
      page: 1,
      limit: 10,
      queued_from: undefined,
      queued_to: undefined,
      search: "",
      status: "pending",
      source_kind: "opd",
    });
    expect(result.total).toBe(1);
    expect(result.items[0]?.patient_name).toBe("Alice");
  });

  it("paginates projection rows for OPD queue", async () => {
    const projection = queueProjectionRepo({
      total: 3,
      items: [projectionRow("visit-2", "patient-b", "2026-06-02T12:00:00.000Z")],
    });

    const page2 = await listPharmacyQueue(baseDeps(projection), TENANT, {
      page: 2,
      limit: 2,
      status: "all",
    });

    expect(page2.total).toBe(3);
    expect(page2.items).toHaveLength(1);
  });
});
