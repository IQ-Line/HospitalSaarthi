import { fail, loadBill, ok, requireStatus, syncBillTotals, withActiveItems } from "../lib/use-case.js";
import type { BillWithItems, UseCaseResult } from "../domain/bill.types.js";
import type { BillingDeps } from "../ports.js";

export async function finalizeBill(
  deps: BillingDeps,
  tenantId: string,
  billId: string,
  approvedBy?: string | null,
): Promise<UseCaseResult<BillWithItems>> {
  const loaded = await loadBill(deps.billingRepo, tenantId, billId);
  if (!loaded.ok) return loaded;
  const statusErr = requireStatus(loaded.data.bill.status, ["DRAFT"], "Only DRAFT bills can be finalized");
  if (statusErr) return statusErr;

  const synced = (await syncBillTotals(deps.billingRepo, tenantId, loaded.data.bill)) ?? loaded.data.bill;
  const bill = await deps.billingRepo.updateBill(tenantId, billId, {
    status: "FINALIZED",
    approved_by: approvedBy ?? null,
    approved_at: new Date().toISOString(),
    outstanding_amount: synced.outstanding_amount,
  });
  if (!bill) return fail("NOT_FOUND", "Bill not found");

  return ok(await withActiveItems(deps.billingRepo, tenantId, bill));
}
