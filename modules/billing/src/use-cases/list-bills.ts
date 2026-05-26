import type { ListBillsQuery, ListBillsResult } from "../domain/bill.types.js";
import type { BillingDeps } from "../ports.js";

export function listBills(
  deps: BillingDeps,
  tenantId: string,
  query: ListBillsQuery,
): Promise<ListBillsResult> {
  return deps.billingRepo.listBills(tenantId, query);
}
