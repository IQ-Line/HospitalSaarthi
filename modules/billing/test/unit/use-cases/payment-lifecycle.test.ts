import { describe, expect, it } from "vitest";
import { randomUUID } from "node:crypto";
import { createInMemoryBillingRepo } from "../../../src/data-access/billing.repository.js";
import { finalizeBill } from "../../../src/use-cases/finalize-bill.js";
import { recordPayment } from "../../../src/use-cases/record-payment.js";
import { cancelBill } from "../../../src/use-cases/cancel-bill.js";
import { applyBillDiscount } from "../../../src/use-cases/apply-bill-discount.js";
import type { BillItemRow, BillRow } from "../../../src/domain/bill.types.js";
import type { BillingDeps } from "../../../src/ports.js";

const TENANT = "00000000-0000-0000-0000-0000000000b1";
const PATIENT = "11111111-1111-1111-1111-111111111111";

// ---------------------------------------------------------------------------
// Payment-capture state machine (vet 2026-06-22, billing P1): every transition
// is asserted by READING THE BILL BACK from the repo — not by trusting the
// use-case return value. Covers finalize gating, partial->full PARTIALLY_PAID
// ->PAID, overpayment rejection, pay-before-finalize, cancel-with-payments block,
// and discount-on-DRAFT-only. (Tax-exempt fixtures: subtotal == total here.)
// ---------------------------------------------------------------------------

function seedBill(over: Partial<BillRow>): BillRow {
  const now = new Date().toISOString();
  return {
    id: randomUUID(),
    iq_tenant_id: TENANT,
    bill_number: "B-TEST-000001",
    patient_id: PATIENT,
    visit_id: null,
    visit_type: "OPD",
    bill_type: "STANDALONE",
    bill_date: now.slice(0, 10),
    subtotal: "100.0000",
    discount_amount: "0.0000",
    discount_reason: null,
    tax_amount: "0.0000",
    total_amount: "100.0000",
    round_off_amount: "0.0000",
    net_amount: "100.0000",
    paid_amount: "0.0000",
    outstanding_amount: "100.0000",
    status: "FINALIZED",
    notes: null,
    cancellation_reason: null,
    created_by: null,
    approved_by: null,
    cancelled_by: null,
    created_at: now,
    updated_at: now,
    approved_at: null,
    cancelled_at: null,
    ...over,
  };
}

function activeItem(billId: string, net: string, tax: string): BillItemRow {
  const now = new Date().toISOString();
  return {
    id: randomUUID(),
    iq_tenant_id: TENANT,
    bill_id: billId,
    service_id: null,
    item_type: "SERVICE",
    item_code: "REG_FEE",
    description: "Registration Fee",
    quantity: "1.00",
    unit_price: net,
    gross_amount: net,
    discount_percentage: "0.0000",
    discount_amount: "0.0000",
    net_amount: net,
    tax_percentage: "0.0000",
    tax_amount: tax,
    total_amount: (Number(net) + Number(tax)).toFixed(4),
    source_module: "opd",
    source_ref: null,
    performed_date: null,
    performed_by: null,
    department: null,
    status: "ACTIVE",
    idempotency_key: null,
    notes: null,
    created_at: now,
    updated_at: now,
  };
}

function setup(bill: BillRow, items: BillItemRow[] = []): {
  deps: BillingDeps;
  bills: BillRow[];
} {
  const { repo, bills, items: itemStore } = createInMemoryBillingRepo();
  bills.push(bill);
  itemStore.push(...items);
  const deps: BillingDeps = {
    billingRepo: repo,
    tariffRepo: {
      findById: async () => undefined,
      findByCodeAndProvider: async () => undefined,
      update: async () => undefined,
    },
  };
  return { deps, bills };
}

describe("billing payment lifecycle", () => {
  it("finalize: DRAFT -> FINALIZED, recomputes outstanding; rejects non-DRAFT", async () => {
    const bill = seedBill({ status: "DRAFT" });
    const { deps } = setup(bill, [activeItem(bill.id, "100.0000", "0.0000")]);

    const res = await finalizeBill(deps, TENANT, bill.id);
    expect(res.ok).toBe(true);

    const after = await deps.billingRepo.getBill(TENANT, bill.id);
    expect(after?.bill.status).toBe("FINALIZED");
    expect(after?.bill.outstanding_amount).toBe("100.0000");

    // Re-finalizing a FINALIZED bill is a conflict.
    const again = await finalizeBill(deps, TENANT, bill.id);
    expect(again.ok).toBe(false);
    if (!again.ok) expect(again.code).toBe("CONFLICT");
  });

  it("record-payment: partial then full drives PARTIALLY_PAID -> PAID (read back)", async () => {
    const bill = seedBill({ status: "FINALIZED" });
    const { deps } = setup(bill);

    const partial = await recordPayment(deps, TENANT, {
      bill_id: bill.id,
      amount: "60.0000",
      payment_method: "CASH",
    });
    expect(partial.ok).toBe(true);
    let after = await deps.billingRepo.getBill(TENANT, bill.id);
    expect(after?.bill.status).toBe("PARTIALLY_PAID");
    expect(after?.bill.paid_amount).toBe("60.0000");
    expect(after?.bill.outstanding_amount).toBe("40.0000");

    const full = await recordPayment(deps, TENANT, {
      bill_id: bill.id,
      amount: "40.0000",
      payment_method: "CASH",
    });
    expect(full.ok).toBe(true);
    after = await deps.billingRepo.getBill(TENANT, bill.id);
    expect(after?.bill.status).toBe("PAID");
    expect(after?.bill.paid_amount).toBe("100.0000");
    expect(after?.bill.outstanding_amount).toBe("0.0000");
  });

  it("record-payment: rejects overpayment and leaves the bill untouched", async () => {
    const bill = seedBill({ status: "FINALIZED" });
    const { deps } = setup(bill);

    const res = await recordPayment(deps, TENANT, {
      bill_id: bill.id,
      amount: "150.0000",
      payment_method: "CASH",
    });
    expect(res.ok).toBe(false);
    if (!res.ok) {
      expect(res.code).toBe("VALIDATION");
      expect(res.message).toContain("exceeds");
    }
    const after = await deps.billingRepo.getBill(TENANT, bill.id);
    expect(after?.bill.paid_amount).toBe("0.0000");
    expect(after?.bill.status).toBe("FINALIZED");
  });

  it("record-payment: exact full payment is allowed (boundary, no float drift)", async () => {
    const bill = seedBill({ status: "FINALIZED" });
    const { deps } = setup(bill);
    const res = await recordPayment(deps, TENANT, {
      bill_id: bill.id,
      amount: "100.0000",
      payment_method: "UPI",
    });
    expect(res.ok).toBe(true);
    const after = await deps.billingRepo.getBill(TENANT, bill.id);
    expect(after?.bill.status).toBe("PAID");
    expect(after?.bill.outstanding_amount).toBe("0.0000");
  });

  it("record-payment: rejects payment before finalize (DRAFT)", async () => {
    const bill = seedBill({ status: "DRAFT" });
    const { deps } = setup(bill);
    const res = await recordPayment(deps, TENANT, {
      bill_id: bill.id,
      amount: "10.0000",
      payment_method: "CASH",
    });
    expect(res.ok).toBe(false);
    if (!res.ok) {
      expect(res.code).toBe("CONFLICT");
      expect(res.message).toContain("FINALIZED");
    }
  });

  it("cancel: allowed on FINALIZED with no payments; blocked once a payment exists", async () => {
    const clean = seedBill({ status: "FINALIZED", paid_amount: "0.0000" });
    const { deps: d1 } = setup(clean);
    const okCancel = await cancelBill(d1, TENANT, clean.id, { reason: "duplicate" });
    expect(okCancel.ok).toBe(true);
    expect((await d1.billingRepo.getBill(TENANT, clean.id))?.bill.status).toBe("CANCELLED");

    const paid = seedBill({
      status: "PARTIALLY_PAID",
      paid_amount: "50.0000",
      outstanding_amount: "50.0000",
    });
    const { deps: d2 } = setup(paid);
    const blocked = await cancelBill(d2, TENANT, paid.id, { reason: "mistake" });
    expect(blocked.ok).toBe(false);
    if (!blocked.ok) expect(blocked.code).toBe("CONFLICT");
    // Bill must remain unchanged.
    expect((await d2.billingRepo.getBill(TENANT, paid.id))?.bill.status).toBe("PARTIALLY_PAID");
  });

  it("apply-discount: reduces net on DRAFT (read back); rejected on FINALIZED", async () => {
    const draft = seedBill({ status: "DRAFT" });
    const { deps: d1 } = setup(draft, [activeItem(draft.id, "100.0000", "0.0000")]);
    const res = await applyBillDiscount(d1, TENANT, draft.id, {
      discount_amount: "20.0000",
      discount_reason: "loyalty",
    });
    expect(res.ok).toBe(true);
    const after = await d1.billingRepo.getBill(TENANT, draft.id);
    expect(after?.bill.discount_amount).toBe("20.0000");
    expect(after?.bill.net_amount).toBe("80.0000");
    expect(after?.bill.outstanding_amount).toBe("80.0000");

    const finalized = seedBill({ status: "FINALIZED" });
    const { deps: d2 } = setup(finalized);
    const rejected = await applyBillDiscount(d2, TENANT, finalized.id, {
      discount_amount: "10.0000",
    });
    expect(rejected.ok).toBe(false);
    if (!rejected.ok) expect(rejected.code).toBe("CONFLICT");
  });
});
