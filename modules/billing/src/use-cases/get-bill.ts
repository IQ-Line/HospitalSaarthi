import type { BillWithItems, UseCaseResult } from "../domain/bill.types.js";
import type { BillingDeps } from "../ports.js";
import { loadBill } from "../lib/use-case.js";

export const getBill = (
  deps: BillingDeps,
  tenantId: string,
  billId: string,
): Promise<UseCaseResult<BillWithItems>> => loadBill(deps.billingRepo, tenantId, billId);
