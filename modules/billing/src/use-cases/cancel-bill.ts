import { fail, loadBill, ok, withActiveItems } from "../lib/use-case.js";
import type { BillWithItems, CancelBillInput, UseCaseResult } from "../domain/bill.types.js";
import type { BillingDeps } from "../ports.js";

const CANCELLABLE = new Set(["DRAFT", "FINALIZED", "PARTIALLY_PAID"]);

export async function cancelBill(
  deps: BillingDeps,
  tenantId: string,
  billId: string,
  input: CancelBillInput,
  cancelledBy?: string | null,
): Promise<UseCaseResult<BillWithItems>> {
  if (!input.reason?.trim()) return fail("VALIDATION", "reason is required");

  const loaded = await loadBill(deps.billingRepo, tenantId, billId);
  if (!loaded.ok) return loaded;
  const { bill } = loaded.data;

  if (!CANCELLABLE.has(bill.status)) {
    return fail("CONFLICT", `Cannot cancel bill in status ${bill.status}`);
  }
  if (Number(bill.paid_amount) > 0 && bill.status !== "DRAFT") {
    return fail("CONFLICT", "Cannot cancel bill with payments recorded");
  }

  const updated = await deps.billingRepo.updateBill(tenantId, billId, {
    status: "CANCELLED",
    cancellation_reason: input.reason.trim(),
    cancelled_by: cancelledBy ?? null,
    cancelled_at: new Date().toISOString(),
    notes: input.notes ?? bill.notes,
  });
  if (!updated) return fail("NOT_FOUND", "Bill not found");

  return ok(await withActiveItems(deps.billingRepo, tenantId, updated));
}
