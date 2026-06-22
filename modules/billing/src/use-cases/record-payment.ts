import { money, moneyAdd, moneyGt, moneyGte, moneySub } from "../lib/money.js";
import { fail, loadBill, ok, requireStatus } from "../lib/use-case.js";
import type { BillWithItems, RecordPaymentInput, UseCaseResult } from "../domain/bill.types.js";
import type { BillingDeps } from "../ports.js";

const METHODS = new Set(["CASH", "CARD", "UPI", "CHEQUE", "BANK_TRANSFER"]);

export async function recordPayment(
  deps: BillingDeps,
  tenantId: string,
  input: RecordPaymentInput,
): Promise<
  UseCaseResult<{ payment_id: string; receipt_number: string | null; bill: BillWithItems["bill"] }>
> {
  const amount = money(input.amount);
  if (moneyGt("0.0000", amount)) return fail("VALIDATION", "amount must be > 0");
  if (!METHODS.has(input.payment_method)) return fail("VALIDATION", "Invalid payment_method");

  const loaded = await loadBill(deps.billingRepo, tenantId, input.bill_id);
  if (!loaded.ok) return loaded;
  const { bill } = loaded.data;

  const statusErr = requireStatus(
    bill.status,
    ["FINALIZED", "PARTIALLY_PAID"],
    "Bill must be FINALIZED before payment",
  );
  if (statusErr) return statusErr;

  // String-money math (both operands are 4dp-rounded): exact comparison, no float epsilon.
  const paid = moneyAdd(bill.paid_amount, amount);
  if (moneyGt(paid, bill.net_amount)) {
    return fail("VALIDATION", "Payment exceeds bill net amount");
  }

  const payment = await deps.billingRepo.insertPayment({
    iq_tenant_id: tenantId,
    payment_number: "",
    receipt_number: null,
    bill_id: bill.id,
    patient_id: bill.patient_id,
    payment_date: input.payment_date ?? new Date().toISOString(),
    amount,
    payment_method: input.payment_method,
    transaction_id: input.transaction_id ?? null,
    reference_number: input.reference_number ?? null,
    status: "SUCCESS",
    received_by: input.received_by ?? null,
    notes: input.notes ?? null,
  });

  const updated = await deps.billingRepo.updateBill(tenantId, input.bill_id, {
    paid_amount: paid,
    outstanding_amount: moneySub(bill.net_amount, paid),
    status: moneyGte(paid, bill.net_amount) ? "PAID" : "PARTIALLY_PAID",
  });
  if (!updated) return fail("NOT_FOUND", "Bill not found");

  return ok({ payment_id: payment.id, receipt_number: payment.receipt_number, bill: updated });
}
