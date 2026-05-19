import { money, moneyGt } from "../lib/money.js";
import { fail, loadBill, ok, requireStatus, syncBillTotals, withActiveItems } from "../lib/use-case.js";
import type { ApplyBillDiscountInput, BillWithItems, UseCaseResult } from "../domain/bill.types.js";
import type { BillingDeps } from "../ports.js";

export async function applyBillDiscount(
  deps: BillingDeps,
  tenantId: string,
  billId: string,
  input: ApplyBillDiscountInput,
): Promise<UseCaseResult<BillWithItems>> {
  const discount = money(input.discount_amount);
  if (moneyGt("0.0000", discount)) return fail("VALIDATION", "discount_amount must be >= 0");

  const loaded = await loadBill(deps.billingRepo, tenantId, billId);
  if (!loaded.ok) return loaded;
  const statusErr = requireStatus(loaded.data.bill.status, ["DRAFT"], "Discount allowed only on DRAFT bills");
  if (statusErr) return statusErr;

  const updated = await deps.billingRepo.updateBill(tenantId, billId, {
    discount_amount: discount,
    discount_reason: input.discount_reason ?? null,
  });
  if (!updated) return fail("NOT_FOUND", "Bill not found");

  const bill = (await syncBillTotals(deps.billingRepo, tenantId, updated)) ?? updated;
  return ok(await withActiveItems(deps.billingRepo, tenantId, bill));
}
