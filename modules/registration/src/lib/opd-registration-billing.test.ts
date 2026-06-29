import { describe, expect, it, vi } from "vitest";
import type { BillingWritePort } from "../ports.js";
import { executeOpdRegistrationBilling } from "./opd-registration-billing.js";

describe("executeOpdRegistrationBilling", () => {
  it("captures registration and consultation charges then finalizes and pays", async () => {
    const billingWritePort: BillingWritePort = {
      captureCharge: vi
        .fn()
        .mockResolvedValueOnce({ bill_id: "bill-1" })
        .mockResolvedValueOnce({ bill_id: "bill-1" }),
      applyBillDiscount: vi.fn().mockResolvedValue(undefined),
      finalizeBill: vi.fn().mockResolvedValue(undefined),
      recordPayment: vi.fn().mockResolvedValue(undefined),
    };

    const billId = await executeOpdRegistrationBilling(
      billingWritePort,
      "tenant-1",
      {
        patient_id: "patient-1",
        registration_id: "reg-1",
        visit_id: "visit-1",
        doctor_id: "doctor-1",
        idempotencyKey: "idem-1",
      },
      {
        registration_fee: { item_code: "Reg_01" },
        consultation_fee: { item_code: "CONS_01" },
        department_name: "Nephrology",
        amount_paid: 220,
        payment_method: "CASH",
      },
    );

    expect(billId).toBe("bill-1");
    expect(billingWritePort.captureCharge).toHaveBeenCalledTimes(2);
    expect(billingWritePort.finalizeBill).toHaveBeenCalledWith(
      "tenant-1",
      "bill-1",
      undefined,
    );
    expect(billingWritePort.recordPayment).toHaveBeenCalledWith(
      "tenant-1",
      expect.objectContaining({
        bill_id: "bill-1",
        amount: 220,
        payment_method: "CASH",
      }),
      "idem-1:payment",
      undefined,
    );
  });

  it("returns null when no tariff item codes are provided", async () => {
    const billingWritePort: BillingWritePort = {
      captureCharge: vi.fn(),
      applyBillDiscount: vi.fn(),
      finalizeBill: vi.fn(),
      recordPayment: vi.fn(),
    };

    const billId = await executeOpdRegistrationBilling(
      billingWritePort,
      "tenant-1",
      {
        patient_id: "patient-1",
        registration_id: "reg-1",
        visit_id: "visit-1",
        idempotencyKey: "idem-1",
      },
      {},
    );

    expect(billId).toBeNull();
    expect(billingWritePort.captureCharge).not.toHaveBeenCalled();
  });
});
