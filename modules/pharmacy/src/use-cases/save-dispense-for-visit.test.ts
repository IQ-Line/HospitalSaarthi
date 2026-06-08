import { describe, expect, it, vi } from "vitest";
import type { OpdPrescriptionSnapshot } from "../domain/pharmacy.types.js";
import type { DispenseRecordRepo, MasterDataGatewayPort, OpdGatewayPort } from "../ports.js";
import { DispenseVisitNotFoundError } from "./get-dispense-for-visit.js";
import {
  DispensePatientMismatchError,
  DispenseValidationError,
  saveDispenseForVisit,
} from "./save-dispense-for-visit.js";

const TENANT = "00000000-0000-0000-0000-000000000001";
const VISIT = "00000000-0000-0000-0000-0000000000bb";
const MED_ID = "11111111-1111-4111-8111-111111111111";

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
};

describe("saveDispenseForVisit", () => {
  it("upserts dispense and returns response", async () => {
    const opdGateway: OpdGatewayPort = {
      listCompletedVisits: vi.fn(),
      getVisitPrescription: vi.fn(async () => prescription),
    };
    const dispenseRecordRepo: DispenseRecordRepo = {
      findByVisit: vi.fn(),
      listByVisitIds: vi.fn(),
      findLinesByRecordId: vi.fn(),
      upsertForVisit: vi.fn(async () => ({
        record: {
          id: "rec-2",
          iq_tenant_id: TENANT,
          walk_in_order: false,
          walk_in_patient_id: null,
          visit_id: VISIT,
          patient_id: "patient-2",
          opd_prescription_id: "rx-2",
          subtotal: "20.0000",
          discount: "0.0000",
          total_amount: "20.0000",
          notes: null,
          dispense_status: "issued",
          created_at: new Date("2026-06-02T09:00:00.000Z"),
          created_by: "user-1",
        },
        lines: [
          {
            id: "line-2",
            iq_tenant_id: TENANT,
            dispense_record_id: "rec-2",
            medicine_id: MED_ID,
            medicine_display_name: "Tab A",
            prescribed_quantity: null,
            quantity_dispensed: "2",
            unit_amount: "10",
            line_discount: "0.0000",
            tax_percent: "0.0000",
            tax_amount: "0.0000",
            line_total: "20.0000",
            created_at: new Date("2026-06-02T09:00:00.000Z"),
          },
        ],
      })),
    };

    const result = await saveDispenseForVisit(
      { opdGateway, dispenseRecordRepo, masterDataGateway },
      TENANT,
      {
        visitId: VISIT,
        patient_id: "patient-2",
        lines: [sampleLine],
        createdBy: "user-1",
      },
    );

    expect(result.has_dispense).toBe(true);
    expect(result.record_id).toBe("rec-2");
    expect(result.subtotal).toBe("20.0000");
    expect(result.discount).toBe("0.0000");
    expect(result.total_amount).toBe("20.0000");
    expect(dispenseRecordRepo.upsertForVisit).toHaveBeenCalledWith(
      TENANT,
      expect.objectContaining({
        visit_id: VISIT,
        patient_id: "patient-2",
        opd_prescription_id: "rx-2",
      }),
    );
  });

  it("applies discount to compute total_amount", async () => {
    const opdGateway: OpdGatewayPort = {
      listCompletedVisits: vi.fn(),
      getVisitPrescription: vi.fn(async () => prescription),
    };
    const dispenseRecordRepo: DispenseRecordRepo = {
      findByVisit: vi.fn(),
      listByVisitIds: vi.fn(),
      findLinesByRecordId: vi.fn(),
      upsertForVisit: vi.fn(async () => ({
        record: {
          id: "rec-3",
          iq_tenant_id: TENANT,
          walk_in_order: false,
          walk_in_patient_id: null,
          visit_id: VISIT,
          patient_id: "patient-2",
          opd_prescription_id: "rx-2",
          subtotal: "100.0000",
          discount: "10.0000",
          total_amount: "90.0000",
          notes: null,
          dispense_status: "issued",
          created_at: new Date("2026-06-02T10:00:00.000Z"),
          created_by: null,
        },
        lines: [],
      })),
    };

    const result = await saveDispenseForVisit(
      { opdGateway, dispenseRecordRepo, masterDataGateway },
      TENANT,
      {
        visitId: VISIT,
        patient_id: "patient-2",
        discount: "10",
        lines: [
          {
            medicine_id: MED_ID,
            medicine_display_name: "Tab B",
            quantity_dispensed: "10",
            unit_amount: "10",
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
      listCompletedVisits: vi.fn(),
      getVisitPrescription: vi.fn(async () => prescription),
    };
    const dispenseRecordRepo: DispenseRecordRepo = {
      findByVisit: vi.fn(),
      listByVisitIds: vi.fn(),
      findLinesByRecordId: vi.fn(),
      upsertForVisit: vi.fn(),
    };

    await expect(
      saveDispenseForVisit(
        { opdGateway, dispenseRecordRepo, masterDataGateway },
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
            },
          ],
        },
      ),
    ).rejects.toBeInstanceOf(DispenseValidationError);
  });

  it("rejects patient mismatch", async () => {
    const opdGateway: OpdGatewayPort = {
      listCompletedVisits: vi.fn(),
      getVisitPrescription: vi.fn(async () => prescription),
    };
    const dispenseRecordRepo: DispenseRecordRepo = {
      findByVisit: vi.fn(),
      listByVisitIds: vi.fn(),
      findLinesByRecordId: vi.fn(),
      upsertForVisit: vi.fn(),
    };

    await expect(
      saveDispenseForVisit(
        { opdGateway, dispenseRecordRepo, masterDataGateway },
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
      listCompletedVisits: vi.fn(),
      getVisitPrescription: vi.fn(async () => prescription),
    };
    const dispenseRecordRepo: DispenseRecordRepo = {
      findByVisit: vi.fn(),
      listByVisitIds: vi.fn(),
      findLinesByRecordId: vi.fn(),
      upsertForVisit: vi.fn(),
    };

    await expect(
      saveDispenseForVisit(
        { opdGateway, dispenseRecordRepo, masterDataGateway },
        TENANT,
        { visitId: VISIT, patient_id: "patient-2", lines: [] },
      ),
    ).rejects.toBeInstanceOf(DispenseValidationError);
  });

  it("rejects free-text lines without catalog medicine_id", async () => {
    const opdGateway: OpdGatewayPort = {
      listCompletedVisits: vi.fn(),
      getVisitPrescription: vi.fn(async () => prescription),
    };
    const dispenseRecordRepo: DispenseRecordRepo = {
      findByVisit: vi.fn(),
      listByVisitIds: vi.fn(),
      findLinesByRecordId: vi.fn(),
      upsertForVisit: vi.fn(),
    };

    await expect(
      saveDispenseForVisit(
        { opdGateway, dispenseRecordRepo, masterDataGateway },
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

  it("throws when OPD prescription is missing", async () => {
    const opdGateway: OpdGatewayPort = {
      listCompletedVisits: vi.fn(),
      getVisitPrescription: vi.fn(async () => null),
    };
    const dispenseRecordRepo: DispenseRecordRepo = {
      findByVisit: vi.fn(),
      listByVisitIds: vi.fn(),
      findLinesByRecordId: vi.fn(),
      upsertForVisit: vi.fn(),
    };

    await expect(
      saveDispenseForVisit(
        { opdGateway, dispenseRecordRepo, masterDataGateway },
        TENANT,
        {
          visitId: VISIT,
          patient_id: "patient-2",
          lines: [sampleLine],
        },
      ),
    ).rejects.toBeInstanceOf(DispenseVisitNotFoundError);
  });
});
