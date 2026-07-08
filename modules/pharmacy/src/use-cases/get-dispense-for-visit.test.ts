import { describe, expect, it, vi } from "vitest";
import type { OpdPrescriptionSnapshot } from "../domain/pharmacy.types.js";
import { mockDispenseLine, mockDispenseRecord } from "../test-fixtures/dispense.js";
import type { DispenseRecordRepo, MasterDataGatewayPort, OpdGatewayPort } from "../ports.js";
import { DispenseVisitNotFoundError, getDispenseForVisit } from "./get-dispense-for-visit.js";

const TENANT = "00000000-0000-0000-0000-000000000001";
const VISIT = "00000000-0000-0000-0000-0000000000aa";

const prescription: OpdPrescriptionSnapshot = {
  prescription_id: "rx-1",
  visit_id: VISIT,
  patient_id: "patient-1",
  visit_status: "completed",
  prescription_status: "final",
  doctor_id: null,
  doctor_name: null,
  finalized_at: null,
  vitals_summary: null,
  complaints_summary: null,
  diagnosis_summary: null,
  medicines: [
    {
      line_no: 1,
      medicine_id: "med-1",
      name: "Paracetamol",
      strength: "500mg",
      dosage: null,
      duration: "5",
      frequency: "BD",
      quantity: "10",
      route: null,
    },
    {
      line_no: 2,
      medicine_id: "missing",
      name: "Unknown",
      strength: null,
      dosage: null,
      duration: null,
      frequency: null,
      quantity: "1",
      route: null,
    },
  ],
};

const masterDataGateway: MasterDataGatewayPort = {
  getMedicineById: vi.fn(async (_tenantId, medicineId) =>
    medicineId === "med-1"
      ? {
          display_name: "Paracetamol",
          strength_display: "500mg",
          price: 10,
          is_active: true,
          is_deleted: false,
        }
      : null,
  ),
};

const userLookup = {
  resolveDoctorNames: vi.fn(async () => new Map<string, string>()),
};

const queueProjection = {
  visit_id: VISIT,
  iq_tenant_id: TENANT,
  patient_id: "patient-1",
  prescription_id: "rx-1",
  doctor_id: null,
  visit_status: "completed",
  prescription_status: "final",
  medicine_count: 1,
  queued_at: new Date("2026-06-01T12:00:00.000Z"),
  patient_name: "Jane Doe",
  uhid: "UHID-001",
  phone: null,
  age_years: 33,
  gender: "female",
  doctor_name: null,
  formatted_visit_id: "OP2606090000019",
  dispense_status: "pending" as const,
  last_synced_at: new Date("2026-06-01T12:00:00.000Z"),
};

const opdQueueProjectionRepo = {
  listForQueue: vi.fn(),
  upsert: vi.fn(),
  updateDispenseStatus: vi.fn(),
  deleteByVisitId: vi.fn(),
  findByVisitId: vi.fn(async () => queueProjection),
};

describe("getDispenseForVisit", () => {
  it("returns full OPD prescription and filtered dispensable medicines when no record exists", async () => {
    const opdGateway: OpdGatewayPort = {
      getVisitPrescription: vi.fn(async () => prescription),
    };
    const dispenseRecordRepo: DispenseRecordRepo = {
      findByVisit: vi.fn(async () => undefined),
      listByVisitIds: vi.fn(),
      findLinesByRecordId: vi.fn(),
      upsertForVisit: vi.fn(),
    };

    const result = await getDispenseForVisit(
      { opdGateway, dispenseRecordRepo, masterDataGateway, userLookup, opdQueueProjectionRepo },
      TENANT,
      { visitId: VISIT },
    );

    expect(result.has_dispense).toBe(false);
    expect(result.record_id).toBeNull();
    expect(result.lines).toEqual([]);
    expect(result.opd_prescription?.medicines).toHaveLength(2);
    expect(result.dispensable_medicines).toHaveLength(1);
    expect(result.dispensable_medicines[0]?.medicine_id).toBe("med-1");
    expect(result.patient_name).toBe("Jane Doe");
    expect(result.uhid).toBe("UHID-001");
    expect(result.formatted_visit_id).toBe("OP2606090000019");
  });

  it("returns saved record and filtered line items", async () => {
    const saved = mockDispenseRecord({
      id: "rec-1",
      iq_tenant_id: TENANT,
      visit_id: VISIT,
      patient_id: "patient-1",
      opd_prescription_id: "rx-1",
      subtotal: "50.0000",
      total_amount: "50.0000",
      notes: "counter",
      created_at: new Date("2026-06-02T08:00:00.000Z"),
      updated_at: new Date("2026-06-02T08:00:00.000Z"),
    });
    const lines = [
      mockDispenseLine({
        id: "line-1",
        iq_tenant_id: TENANT,
        dispense_id: "rec-1",
        medicine_id: "med-1",
        prescribed_quantity: "10",
        quantity_dispensed: "5",
        line_total: "50.0000",
        created_at: new Date("2026-06-02T08:00:00.000Z"),
        updated_at: new Date("2026-06-02T08:00:00.000Z"),
      }),
    ];

    const opdGateway: OpdGatewayPort = {
      getVisitPrescription: vi.fn(async () => prescription),
    };
    const dispenseRecordRepo: DispenseRecordRepo = {
      findByVisit: vi.fn(async () => saved),
      listByVisitIds: vi.fn(),
      findLinesByRecordId: vi.fn(async () => lines),
      upsertForVisit: vi.fn(),
    };

    const result = await getDispenseForVisit(
      { opdGateway, dispenseRecordRepo, masterDataGateway, userLookup, opdQueueProjectionRepo },
      TENANT,
      { visitId: VISIT },
    );

    expect(result.has_dispense).toBe(true);
    expect(result.record_id).toBe("rec-1");
    expect(result.total_amount).toBe("50.0000");
    expect(result.lines).toHaveLength(1);
  });

  it("throws when OPD prescription is missing", async () => {
    const opdGateway: OpdGatewayPort = {
      getVisitPrescription: vi.fn(async () => null),
    };
    const dispenseRecordRepo: DispenseRecordRepo = {
      findByVisit: vi.fn(),
      listByVisitIds: vi.fn(),
      findLinesByRecordId: vi.fn(),
      upsertForVisit: vi.fn(),
    };

    await expect(
      getDispenseForVisit(
        { opdGateway, dispenseRecordRepo, masterDataGateway, userLookup, opdQueueProjectionRepo },
        TENANT,
        { visitId: VISIT },
      ),
    ).rejects.toBeInstanceOf(DispenseVisitNotFoundError);
  });
});
