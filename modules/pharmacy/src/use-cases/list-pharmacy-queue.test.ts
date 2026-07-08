import { describe, expect, it, vi } from "vitest";
import type { OpdQueueProjectionRow } from "../domain/pharmacy.types.js";
import type { OpdQueueProjectionRepo } from "../ports.js";
import { listPharmacyQueue } from "./list-pharmacy-queue.js";

const TENANT = "00000000-0000-0000-0000-000000000001";

function projectionRow(visitId: string, patientId: string, queuedAt: string): OpdQueueProjectionRow {
  return {
    visit_id: visitId,
    iq_tenant_id: TENANT,
    patient_id: patientId,
    prescription_id: `rx-${visitId}`,
    doctor_id: "doctor-1",
    visit_status: "completed",
    prescription_status: "final",
    medicine_count: 2,
    queued_at: new Date(queuedAt),
    patient_name: patientId === "patient-a" ? "Alice" : "Bob",
    uhid: `UHID-${patientId}`,
    phone: null,
    age_years: 30,
    gender: "male",
    doctor_name: "Dr. Demo DoctorOne",
    formatted_visit_id: null,
    dispense_status: "pending",
    last_synced_at: new Date(queuedAt),
  };
}

function opdQueueProjectionRepo(
  listResult: { items: OpdQueueProjectionRow[]; total: number },
): OpdQueueProjectionRepo {
  return {
    listForQueue: vi.fn(async () => listResult),
    upsert: vi.fn(),
    updateDispenseStatus: vi.fn(),
    deleteByVisitId: vi.fn(),
    findByVisitId: vi.fn(),
  };
}

function baseDeps(projection: OpdQueueProjectionRepo) {
  return {
    opdQueueProjectionRepo: projection,
  };
}

describe("listPharmacyQueue", () => {
  it("lists OPD rows from projection", async () => {
    const projection = opdQueueProjectionRepo({
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
    });
    expect(result.total).toBe(1);
    expect(result.items[0]?.patient_name).toBe("Alice");
  });

  it("paginates projection rows for OPD queue", async () => {
    const projection = opdQueueProjectionRepo({
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
