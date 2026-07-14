import { describe, expect, it, vi } from "vitest";
import type { OpdPrescriptionSnapshot } from "../domain/pharmacy.types.js";
import { mockDispenseLine, mockDispenseRecord } from "../test-fixtures/dispense.js";
import type {
  DispenseRecordRepo,
  InventoryGatewayPort,
  MasterDataGatewayPort,
  OpdGatewayPort,
  QueueProjectionRepo,
  UserLookupPort,
} from "../ports.js";
import { DispenseVisitNotFoundError } from "./get-dispense-for-visit.js";
import {
  DispenseAlreadyIssuedError,
  DispensePatientMismatchError,
  DispensePrescriptionMismatchError,
  DispenseValidationError,
  saveDispenseForVisit,
} from "./save-dispense-for-visit.js";

const TENANT = "00000000-0000-0000-0000-000000000001";
const VISIT = "00000000-0000-0000-0000-0000000000bb";
const MED_ID = "11111111-1111-4111-8111-111111111111";
const ITEM_ID = "22222222-2222-4222-8222-222222222222";
const STORE_ID = "33333333-3333-4333-8333-333333333333";

const prescription: OpdPrescriptionSnapshot = {
  prescription_id: "rx-2",
  visit_id: VISIT,
  patient_id: "patient-2",
  visit_status: "completed",
  prescription_status: "final",
  doctor_id: null,
  doctor_name: null,
  finalized_at: null,
  vitals_summary: null,
  complaints_summary: null,
  diagnosis_summary: null,
  medicines: [],
};

const masterDataGateway: MasterDataGatewayPort = {
  getMedicineById: vi.fn(async (_tenantId, medicineId) =>
    medicineId === MED_ID
      ? {
          display_name: "Tab A",
          strength_display: "",
          price: 10,
          is_active: true,
          is_deleted: false,
        }
      : null,
  ),
};

const sampleLine = {
  medicine_id: MED_ID,
  medicine_display_name: "Tab A",
  quantity_dispensed: "2",
  unit_amount: "10",
  inventory_item_id: ITEM_ID,
};

const userLookup: UserLookupPort = {
  resolveDoctorNames: vi.fn(async () => new Map()),
};

const queueProjectionRepo: QueueProjectionRepo = {
  listForQueue: vi.fn(),
  upsert: vi.fn(),
  updateDispenseStatus: vi.fn(),
  deleteByVisitId: vi.fn(),
  findByVisitId: vi.fn(async () => undefined),
};

const inventoryGateway: InventoryGatewayPort = {
  issueDispenseStock: vi.fn(async () => undefined),
  restoreDispenseStock: vi.fn(async () => undefined),
};

const projectionDeps = {
  masterDataGateway,
  inventoryGateway,
  userLookup,
  queueProjectionRepo,
};

describe("saveDispenseForVisit", () => {
  it("upserts dispense and returns response", async () => {
    const opdGateway: OpdGatewayPort = {
      getVisitPrescription: vi.fn(async () => prescription),
    };
    const dispenseRecordRepo: DispenseRecordRepo = {
      findById: vi.fn(),
      findByVisit: vi.fn(),
      listByVisitIds: vi.fn(),
      findLinesByRecordId: vi.fn(),
      upsertForVisit: vi.fn(async () => ({
        record: mockDispenseRecord({
          id: "rec-2",
          iq_tenant_id: TENANT,
          visit_id: VISIT,
          patient_id: "patient-2",
          opd_prescription_id: "rx-2",
          subtotal: "20.0000",
          total_amount: "20.0000",
          created_at: new Date("2026-06-02T09:00:00.000Z"),
          updated_at: new Date("2026-06-02T09:00:00.000Z"),
          created_by: "user-1",
        }),
        lines: [
          mockDispenseLine({
            id: "line-2",
            iq_tenant_id: TENANT,
            dispense_id: "rec-2",
            medicine_id: MED_ID,
            medicine_display_name: "Tab A",
            quantity_dispensed: "2",
            line_total: "20.0000",
            created_at: new Date("2026-06-02T09:00:00.000Z"),
            updated_at: new Date("2026-06-02T09:00:00.000Z"),
          }),
        ],
      })),
    };

    const result = await saveDispenseForVisit(
      { opdGateway, dispenseRecordRepo, ...projectionDeps },
      TENANT,
      {
        visitId: VISIT,
        patient_id: "patient-2",
        inventory_store_id: STORE_ID,
        lines: [sampleLine],
        createdBy: "user-1",
      },
    );

    expect(result.has_dispense).toBe(true);
    expect(result.record_id).toBe("rec-2");
    expect(result.subtotal).toBe("20.0000");
    expect(result.discount).toBe("0.0000");
    expect(result.total_amount).toBe("20.0000");
    expect(result.dispensable_medicines).toEqual([]);
    expect(result.lines[0]).not.toHaveProperty("iq_tenant_id");
    expect(inventoryGateway.issueDispenseStock).toHaveBeenCalledWith(TENANT, {
      store_id: STORE_ID,
      lines: [{ item_id: ITEM_ID, quantity: 2 }],
    });
    expect(dispenseRecordRepo.upsertForVisit).toHaveBeenCalledWith(
      TENANT,
      expect.objectContaining({
        visit_id: VISIT,
        patient_id: "patient-2",
        opd_prescription_id: "rx-2",
        inventory_store_id: STORE_ID,
      }),
    );
  });

  it("applies discount to compute total_amount", async () => {
    const opdGateway: OpdGatewayPort = {
      getVisitPrescription: vi.fn(async () => prescription),
    };
    const dispenseRecordRepo: DispenseRecordRepo = {
      findById: vi.fn(),
      findByVisit: vi.fn(),
      listByVisitIds: vi.fn(),
      findLinesByRecordId: vi.fn(),
      upsertForVisit: vi.fn(async () => ({
        record: mockDispenseRecord({
          id: "rec-3",
          iq_tenant_id: TENANT,
          visit_id: VISIT,
          patient_id: "patient-2",
          opd_prescription_id: "rx-2",
          subtotal: "100.0000",
          discount: "10.0000",
          total_amount: "90.0000",
          created_at: new Date("2026-06-02T10:00:00.000Z"),
          updated_at: new Date("2026-06-02T10:00:00.000Z"),
        }),
        lines: [
          mockDispenseLine({
            id: "line-3",
            iq_tenant_id: TENANT,
            dispense_id: "rec-3",
            medicine_id: MED_ID,
            medicine_display_name: "Tab B",
            quantity_dispensed: "10",
            line_total: "100.0000",
            created_at: new Date("2026-06-02T10:00:00.000Z"),
            updated_at: new Date("2026-06-02T10:00:00.000Z"),
          }),
        ],
      })),
    };

    const result = await saveDispenseForVisit(
      { opdGateway, dispenseRecordRepo, ...projectionDeps },
      TENANT,
      {
        visitId: VISIT,
        patient_id: "patient-2",
        inventory_store_id: STORE_ID,
        discount: "10",
        lines: [
          {
            medicine_id: MED_ID,
            medicine_display_name: "Tab B",
            quantity_dispensed: "10",
            unit_amount: "10",
            inventory_item_id: ITEM_ID,
          },
        ],
      },
    );

    expect(result.subtotal).toBe("100.0000");
    expect(result.discount).toBe("10.0000");
    expect(result.total_amount).toBe("90.0000");
    expect(dispenseRecordRepo.upsertForVisit).toHaveBeenCalledWith(
      TENANT,
      expect.objectContaining({ discount: "10.0000" }),
    );
  });

  it("rejects discount greater than subtotal", async () => {
    const opdGateway: OpdGatewayPort = {
      getVisitPrescription: vi.fn(async () => prescription),
    };
    const dispenseRecordRepo: DispenseRecordRepo = {
      findById: vi.fn(),
      findByVisit: vi.fn(),
      listByVisitIds: vi.fn(),
      findLinesByRecordId: vi.fn(),
      upsertForVisit: vi.fn(),
    };

    await expect(
      saveDispenseForVisit(
        { opdGateway, dispenseRecordRepo, ...projectionDeps },
        TENANT,
        {
          visitId: VISIT,
          patient_id: "patient-2",
          discount: "50",
          lines: [
            {
              medicine_id: MED_ID,
              medicine_display_name: "Tab A",
              quantity_dispensed: "1",
              unit_amount: "10",
              inventory_item_id: ITEM_ID,
            },
          ],
        },
      ),
    ).rejects.toBeInstanceOf(DispenseValidationError);
  });

  it("rejects patient mismatch", async () => {
    const opdGateway: OpdGatewayPort = {
      getVisitPrescription: vi.fn(async () => prescription),
    };
    const dispenseRecordRepo: DispenseRecordRepo = {
      findById: vi.fn(),
      findByVisit: vi.fn(),
      listByVisitIds: vi.fn(),
      findLinesByRecordId: vi.fn(),
      upsertForVisit: vi.fn(),
    };

    await expect(
      saveDispenseForVisit(
        { opdGateway, dispenseRecordRepo, ...projectionDeps },
        TENANT,
        {
          visitId: VISIT,
          patient_id: "wrong-patient",
          lines: [sampleLine],
        },
      ),
    ).rejects.toBeInstanceOf(DispensePatientMismatchError);
  });

  it("requires at least one line", async () => {
    const opdGateway: OpdGatewayPort = {
      getVisitPrescription: vi.fn(async () => prescription),
    };
    const dispenseRecordRepo: DispenseRecordRepo = {
      findById: vi.fn(),
      findByVisit: vi.fn(),
      listByVisitIds: vi.fn(),
      findLinesByRecordId: vi.fn(),
      upsertForVisit: vi.fn(),
    };

    await expect(
      saveDispenseForVisit(
        { opdGateway, dispenseRecordRepo, ...projectionDeps },
        TENANT,
        { visitId: VISIT, patient_id: "patient-2", lines: [] },
      ),
    ).rejects.toBeInstanceOf(DispenseValidationError);
  });

  it("rejects free-text lines without catalog medicine_id", async () => {
    const opdGateway: OpdGatewayPort = {
      getVisitPrescription: vi.fn(async () => prescription),
    };
    const dispenseRecordRepo: DispenseRecordRepo = {
      findById: vi.fn(),
      findByVisit: vi.fn(),
      listByVisitIds: vi.fn(),
      findLinesByRecordId: vi.fn(),
      upsertForVisit: vi.fn(),
    };

    await expect(
      saveDispenseForVisit(
        { opdGateway, dispenseRecordRepo, ...projectionDeps },
        TENANT,
        {
          visitId: VISIT,
          patient_id: "patient-2",
          lines: [
            {
              medicine_display_name: "Free text only",
              quantity_dispensed: "1",
              unit_amount: "10",
            } as typeof sampleLine,
          ],
        },
      ),
    ).rejects.toBeInstanceOf(DispenseValidationError);
  });

  it("rejects mismatched opd_prescription_id", async () => {
    const opdGateway: OpdGatewayPort = {
      getVisitPrescription: vi.fn(async () => prescription),
    };
    const dispenseRecordRepo: DispenseRecordRepo = {
      findById: vi.fn(),
      findByVisit: vi.fn(),
      listByVisitIds: vi.fn(),
      findLinesByRecordId: vi.fn(),
      upsertForVisit: vi.fn(),
    };

    await expect(
      saveDispenseForVisit(
        { opdGateway, dispenseRecordRepo, ...projectionDeps },
        TENANT,
        {
          visitId: VISIT,
          patient_id: "patient-2",
          opd_prescription_id: "wrong-rx",
          lines: [sampleLine],
        },
      ),
    ).rejects.toBeInstanceOf(DispensePrescriptionMismatchError);
  });

  it("throws when OPD prescription is missing", async () => {
    const opdGateway: OpdGatewayPort = {
      getVisitPrescription: vi.fn(async () => null),
    };
    const dispenseRecordRepo: DispenseRecordRepo = {
      findById: vi.fn(),
      findByVisit: vi.fn(),
      listByVisitIds: vi.fn(),
      findLinesByRecordId: vi.fn(),
      upsertForVisit: vi.fn(),
    };

    await expect(
      saveDispenseForVisit(
        { opdGateway, dispenseRecordRepo, ...projectionDeps },
        TENANT,
        {
          visitId: VISIT,
          patient_id: "patient-2",
          lines: [sampleLine],
        },
      ),
    ).rejects.toBeInstanceOf(DispenseVisitNotFoundError);
  });

  it("rejects save when visit is already fully dispensed", async () => {
    const opdGateway: OpdGatewayPort = {
      getVisitPrescription: vi.fn(async () => prescription),
    };
    const dispenseRecordRepo: DispenseRecordRepo = {
      findById: vi.fn(),
      findByVisit: vi.fn(async () =>
        mockDispenseRecord({
          visit_id: VISIT,
          dispense_status: "issued",
        }),
      ),
      listByVisitIds: vi.fn(),
      findLinesByRecordId: vi.fn(),
      upsertForVisit: vi.fn(),
    };

    await expect(
      saveDispenseForVisit(
        { opdGateway, dispenseRecordRepo, ...projectionDeps },
        TENANT,
        {
          visitId: VISIT,
          patient_id: "patient-2",
          lines: [sampleLine],
        },
      ),
    ).rejects.toBeInstanceOf(DispenseAlreadyIssuedError);

    expect(dispenseRecordRepo.upsertForVisit).not.toHaveBeenCalled();
  });

  it("deducts only newly issued qty on partial re-save", async () => {
    const localInventoryGateway: InventoryGatewayPort = {
      issueDispenseStock: vi.fn(async () => undefined),
      restoreDispenseStock: vi.fn(async () => undefined),
    };
    const opdGateway: OpdGatewayPort = {
      getVisitPrescription: vi.fn(async () => prescription),
    };
    const existing = mockDispenseRecord({
      id: "rec-partial",
      visit_id: VISIT,
      patient_id: "patient-2",
      opd_prescription_id: "rx-2",
      dispense_status: "partial",
      inventory_store_id: STORE_ID,
    });
    const dispenseRecordRepo: DispenseRecordRepo = {
      findById: vi.fn(),
      findByVisit: vi.fn(async () => existing),
      listByVisitIds: vi.fn(),
      findLinesByRecordId: vi.fn(async () => [
        mockDispenseLine({
          dispense_id: existing.id,
          medicine_id: MED_ID,
          inventory_item_id: ITEM_ID,
          quantity_dispensed: "2",
        }),
      ]),
      upsertForVisit: vi.fn(async () => ({
        record: mockDispenseRecord({
          ...existing,
          dispense_status: "issued",
          subtotal: "50.0000",
          total_amount: "50.0000",
        }),
        lines: [
          mockDispenseLine({
            medicine_id: MED_ID,
            inventory_item_id: ITEM_ID,
            quantity_dispensed: "5",
            line_total: "50.0000",
          }),
        ],
      })),
    };

    await saveDispenseForVisit(
      {
        opdGateway,
        dispenseRecordRepo,
        masterDataGateway,
        inventoryGateway: localInventoryGateway,
        userLookup,
        queueProjectionRepo,
      },
      TENANT,
      {
        visitId: VISIT,
        patient_id: "patient-2",
        inventory_store_id: STORE_ID,
        lines: [
          {
            medicine_id: MED_ID,
            medicine_display_name: "Tab A",
            quantity_dispensed: "5",
            unit_amount: "10",
            inventory_item_id: ITEM_ID,
          },
        ],
      },
    );

    expect(localInventoryGateway.issueDispenseStock).toHaveBeenCalledWith(TENANT, {
      store_id: STORE_ID,
      lines: [{ item_id: ITEM_ID, quantity: 3 }],
    });
  });
});
