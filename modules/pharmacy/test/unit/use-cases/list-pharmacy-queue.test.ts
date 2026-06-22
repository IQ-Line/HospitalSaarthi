import { describe, expect, it, vi } from "vitest";
import type { OpdQueueProjectionRow } from "../../../src/domain/pharmacy.types.js";
import type { OpdQueueProjectionRepo, WalkInDispenseRepo } from "../../../src/ports.js";
import { listPharmacyQueue } from "../../../src/use-cases/list-pharmacy-queue.js";

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

function baseDeps(
  projection: OpdQueueProjectionRepo,
  walkInResult: Awaited<ReturnType<WalkInDispenseRepo["listForQueue"]>> = {
    items: [],
    total: 0,
  },
) {
  const walkInDispenseRepo: WalkInDispenseRepo = {
    findByRecordId: vi.fn(),
    listForQueue: vi.fn(async () => walkInResult),
    create: vi.fn(),
    upsert: vi.fn(),
  };

  return {
    walkInDispenseRepo,
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

  it("returns walk-in rows only for kind=walk_in", async () => {
    const projection = opdQueueProjectionRepo({ total: 0, items: [] });
    const walkInRow = {
      record_id: "walk-record-1",
      walk_in_patient_id: "walk-patient-1",
      first_name: "Walk",
      last_name: "In",
      phone: "+919999999999",
      gender: "female",
      date_of_birth: "1990-01-01",
      created_at: new Date("2026-06-03T12:00:00.000Z"),
      medicine_count: 1,
      has_dispense: true,
      dispense_status: "issued" as const,
    };
    const deps = baseDeps(projection, { items: [walkInRow], total: 1 });

    const result = await listPharmacyQueue(deps, TENANT, {
      kind: "walk_in",
      page: 1,
      limit: 10,
      status: "all",
    });

    expect(projection.listForQueue).not.toHaveBeenCalled();
    expect(deps.walkInDispenseRepo.listForQueue).toHaveBeenCalledWith(TENANT, {
      page: 1,
      limit: 10,
      queued_from: undefined,
      queued_to: undefined,
      search: "",
      status: "all",
    });
    expect(result.total).toBe(1);
    expect(result.items[0]?.walk_in_order).toBe(true);
  });
});
