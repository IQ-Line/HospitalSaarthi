import { describe, expect, it, vi } from "vitest";
import type { WalkInDispenseRepo } from "../ports.js";
import { DispenseValidationError } from "./save-dispense-for-visit.js";
import { saveWalkInDispense } from "./walk-in-dispense.js";

const TENANT = "00000000-0000-0000-0000-000000000001";

describe("saveWalkInDispense", () => {
  it("creates walk-in order with patient and lines", async () => {
    const walkInDispenseRepo: WalkInDispenseRepo = {
      findByRecordId: vi.fn(),
      listForQueue: vi.fn(async () => []),
      create: vi.fn(async () => ({
        record: {
          id: "rec-walk-1",
          iq_tenant_id: TENANT,
          walk_in_order: true,
          walk_in_patient_id: "wip-1",
          visit_id: null,
          patient_id: null,
          opd_prescription_id: null,
          subtotal: "100.0000",
          discount: "0.0000",
          total_amount: "100.0000",
          notes: null,
          created_at: new Date("2026-06-05T10:00:00.000Z"),
          created_by: "user-1",
        },
        patient: {
          id: "wip-1",
          iq_tenant_id: TENANT,
          first_name: "Aditya",
          last_name: "Kumar",
          phone: "9876543210",
          gender: "male",
          date_of_birth: "1999-03-14",
          created_at: new Date("2026-06-05T10:00:00.000Z"),
        },
        lines: [],
      })),
      upsert: vi.fn(),
    };

    const result = await saveWalkInDispense(
      { walkInDispenseRepo },
      TENANT,
      {
        walk_in_patient: {
          first_name: "Aditya",
          last_name: "Kumar",
          phone: "9876543210",
          gender: "male",
          date_of_birth: "1999-03-14",
        },
        lines: [
          {
            medicine_display_name: "Paracetamol",
            quantity_dispensed: "10",
            unit_amount: "10",
          },
        ],
        createdBy: "user-1",
      },
    );

    expect(result.walk_in_order).toBe(true);
    expect(result.record_id).toBe("rec-walk-1");
    expect(result.walk_in_patient.first_name).toBe("Aditya");
    expect(walkInDispenseRepo.create).toHaveBeenCalled();
  });

  it("rejects missing patient first name", async () => {
    const walkInDispenseRepo: WalkInDispenseRepo = {
      findByRecordId: vi.fn(),
      listForQueue: vi.fn(async () => []),
      create: vi.fn(),
      upsert: vi.fn(),
    };

    await expect(
      saveWalkInDispense(
        { walkInDispenseRepo },
        TENANT,
        {
          walk_in_patient: {
            first_name: "",
            gender: "male",
          },
          lines: [
            {
              medicine_display_name: "Tab A",
              quantity_dispensed: "1",
              unit_amount: "1",
            },
          ],
        },
      ),
    ).rejects.toBeInstanceOf(DispenseValidationError);
  });
});
