import { describe, expect, it, vi } from "vitest";
import type { DispenseRecord, OpdCompletedVisitSummary } from "../domain/pharmacy.types.js";
import type {
  DispenseRecordRepo,
  EmpiGatewayPort,
  OpdGatewayPort,
  WalkInDispenseRepo,
} from "../ports.js";
import { listPharmacyQueue } from "./list-pharmacy-queue.js";

const TENANT = "00000000-0000-0000-0000-000000000001";

function visit(
  visitId: string,
  patientId: string,
  updatedAt: string,
): OpdCompletedVisitSummary {
  return {
    visit_id: visitId,
    patient_id: patientId,
    prescription_id: `rx-${visitId}`,
    doctor_id: "doctor-1",
    visit_status: "completed",
    prescription_status: "final",
    updated_at: updatedAt,
    finalized_at: updatedAt,
    medicine_count: 2,
  };
}

function record(visitId: string): DispenseRecord {
  return {
    id: `record-${visitId}`,
    iq_tenant_id: TENANT,
    walk_in_order: false,
    walk_in_patient_id: null,
    visit_id: visitId,
    patient_id: "patient-1",
    opd_prescription_id: null,
    subtotal: "100.0000",
    discount: "0.0000",
    total_amount: "100.0000",
    notes: null,
    created_at: new Date("2026-06-01T10:00:00.000Z"),
    created_by: null,
  };
}

function userLookup(doctorNames: Record<string, string>) {
  return {
    resolveDoctorNames: vi.fn(async (_tenantId, userIds: string[]) => {
      const map = new Map<string, string>();
      for (const userId of userIds) {
        const name = doctorNames[userId];
        if (name) map.set(userId, name);
      }
      return map;
    }),
  };
}

function empiGateway(patientNames: Record<string, string>): EmpiGatewayPort {
  return {
    getPatientSummary: vi.fn(async (_tenantId, patientId) => ({
      patient: {
        full_name: patientNames[patientId] ?? null,
        uhid: `UHID-${patientId}`,
        age_years: 30,
        gender: "male",
      },
    })),
  };
}

function walkInDispenseRepo(
  rows: WalkInDispenseRepo["listForQueue"] extends (...args: infer _A) => infer R ? Awaited<R> : never,
): WalkInDispenseRepo {
  return {
    findByRecordId: vi.fn(),
    listForQueue: vi.fn(async () => rows),
    create: vi.fn(),
    upsert: vi.fn(),
  };
}

function baseDeps(
  opdGateway: OpdGatewayPort,
  dispenseRecordRepo: DispenseRecordRepo,
  walkInRows: Parameters<typeof walkInDispenseRepo>[0] = [],
) {
  return {
    opdGateway,
    empiGateway: empiGateway({ "patient-a": "Alice", "patient-b": "Bob", p3: "Carol" }),
    userLookup: userLookup({ "doctor-1": "Dr. Demo DoctorOne" }),
    dispenseRecordRepo,
    walkInDispenseRepo: walkInDispenseRepo(walkInRows),
  };
}

describe("listPharmacyQueue", () => {
  it("merges OPD completed visits with walk-in orders sorted by updated_at", async () => {
    const opdGateway: OpdGatewayPort = {
      listCompletedVisits: vi.fn(async () => ({
        total: 1,
        page: 1,
        limit: 100,
        items: [visit("visit-a", "patient-a", "2026-06-01T12:00:00.000Z")],
      })),
      getVisitPrescription: vi.fn(),
    };

    const dispenseRecordRepo: DispenseRecordRepo = {
      findByVisit: vi.fn(),
      listByVisitIds: vi.fn(async () => [record("visit-a")]),
      findLinesByRecordId: vi.fn(),
      upsertForVisit: vi.fn(),
    };

    const result = await listPharmacyQueue(
      baseDeps(opdGateway, dispenseRecordRepo, [
        {
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
        },
      ]),
      TENANT,
      { page: 1, limit: 10 },
    );

    expect(result.total).toBe(2);
    expect(result.items[0]?.walk_in_order).toBe(true);
    expect(result.items[0]?.patient_name).toBe("Walk In");
    expect(result.items[0]?.phone).toBe("+919999999999");
    expect(result.items[1]?.visit_id).toBe("visit-a");
    expect(result.items[1]?.has_dispense).toBe(true);
  });

  it("paginates merged queue rows", async () => {
    const listCompletedVisits = vi.fn(async () => ({
      total: 3,
      page: 1,
      limit: 100,
      items: [
        visit("visit-3", "p3", "2026-06-03T12:00:00.000Z"),
        visit("visit-2", "patient-b", "2026-06-02T12:00:00.000Z"),
        visit("visit-1", "patient-a", "2026-06-01T12:00:00.000Z"),
      ],
    }));

    const opdGateway: OpdGatewayPort = {
      listCompletedVisits,
      getVisitPrescription: vi.fn(),
    };

    const dispenseRecordRepo: DispenseRecordRepo = {
      findByVisit: vi.fn(),
      listByVisitIds: vi.fn(async () => []),
      findLinesByRecordId: vi.fn(),
      upsertForVisit: vi.fn(),
    };

    const page2 = await listPharmacyQueue(
      baseDeps(opdGateway, dispenseRecordRepo),
      TENANT,
      { page: 2, limit: 2 },
    );

    expect(page2.total).toBe(3);
    expect(page2.page).toBe(2);
    expect(page2.limit).toBe(2);
    expect(page2.items).toHaveLength(1);
    expect(page2.items[0]?.visit_id).toBe("visit-1");
  });

  it("passes queued date range through to OPD and walk-in sources", async () => {
    const listCompletedVisits = vi.fn(async () => ({
      total: 0,
      page: 1,
      limit: 100,
      items: [],
    }));

    const opdGateway: OpdGatewayPort = {
      listCompletedVisits,
      getVisitPrescription: vi.fn(),
    };

    const dispenseRecordRepo: DispenseRecordRepo = {
      findByVisit: vi.fn(),
      listByVisitIds: vi.fn(async () => []),
      findLinesByRecordId: vi.fn(),
      upsertForVisit: vi.fn(),
    };

    const deps = baseDeps(opdGateway, dispenseRecordRepo);

    await listPharmacyQueue(deps, TENANT, {
      page: 1,
      limit: 10,
      queued_from: "2026-06-01",
      queued_to: "2026-06-02",
    });

    expect(listCompletedVisits).toHaveBeenCalledWith(TENANT, {
      page: 1,
      limit: 100,
      queued_from: "2026-06-01",
      queued_to: "2026-06-02",
      bearerToken: undefined,
    });
    expect(deps.walkInDispenseRepo.listForQueue).toHaveBeenCalledWith(TENANT, {
      queued_from: "2026-06-01",
      queued_to: "2026-06-02",
    });
  });

  it("filters pending status server-side across merged rows", async () => {
    const opdGateway: OpdGatewayPort = {
      listCompletedVisits: vi.fn(async () => ({
        total: 2,
        page: 1,
        limit: 100,
        items: [
          visit("visit-b", "patient-b", "2026-06-02T12:00:00.000Z"),
          visit("visit-a", "patient-a", "2026-06-01T12:00:00.000Z"),
        ],
      })),
      getVisitPrescription: vi.fn(),
    };

    const dispenseRecordRepo: DispenseRecordRepo = {
      findByVisit: vi.fn(),
      listByVisitIds: vi.fn(async (_tenantId, visitIds) =>
        visitIds.includes("visit-a") ? [record("visit-a")] : [],
      ),
      findLinesByRecordId: vi.fn(),
      upsertForVisit: vi.fn(),
    };

    const result = await listPharmacyQueue(
      baseDeps(opdGateway, dispenseRecordRepo, [
        {
          record_id: "walk-record-1",
          walk_in_patient_id: "walk-patient-1",
          first_name: "Pending",
          last_name: "WalkIn",
          phone: null,
          gender: "male",
          date_of_birth: null,
          created_at: new Date("2026-06-03T12:00:00.000Z"),
          medicine_count: 0,
          has_dispense: false,
        },
      ]),
      TENANT,
      { page: 1, limit: 10, status: "pending" },
    );

    expect(result.total).toBe(2);
    expect(result.items.map((item) => item.patient_name)).toEqual(["Pending WalkIn", "Bob"]);
  });

  it("filters search server-side by patient name", async () => {
    const opdGateway: OpdGatewayPort = {
      listCompletedVisits: vi.fn(async () => ({
        total: 2,
        page: 1,
        limit: 100,
        items: [
          visit("visit-b", "patient-b", "2026-06-02T12:00:00.000Z"),
          visit("visit-a", "patient-a", "2026-06-01T12:00:00.000Z"),
        ],
      })),
      getVisitPrescription: vi.fn(),
    };

    const dispenseRecordRepo: DispenseRecordRepo = {
      findByVisit: vi.fn(),
      listByVisitIds: vi.fn(async () => []),
      findLinesByRecordId: vi.fn(),
      upsertForVisit: vi.fn(),
    };

    const result = await listPharmacyQueue(
      baseDeps(opdGateway, dispenseRecordRepo),
      TENANT,
      { page: 1, limit: 10, q: "alice", status: "all" },
    );

    expect(result.total).toBe(1);
    expect(result.items[0]?.visit_id).toBe("visit-a");
    expect(result.items[0]?.patient_name).toBe("Alice");
  });
});
