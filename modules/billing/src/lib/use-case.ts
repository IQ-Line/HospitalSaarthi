import type { BillRow, BillWithItems, UseCaseErrorCode, UseCaseResult } from "../domain/bill.types.js";
import type { BillingRepo } from "../ports.js";
import { rollupBillTotals } from "./bill-math.js";

export function fail<T = never>(code: UseCaseErrorCode, message: string): UseCaseResult<T> {
  return { ok: false, code, message };
}

export function ok<T>(data: T): UseCaseResult<T> {
  return { ok: true, data };
}

export async function loadBill(
  repo: BillingRepo,
  tenantId: string,
  billId: string,
): Promise<UseCaseResult<BillWithItems>> {
  const data = await repo.getBill(tenantId, billId);
  return data ? ok(data) : fail("NOT_FOUND", "Bill not found");
}

export async function withActiveItems(
  repo: BillingRepo,
  tenantId: string,
  bill: BillRow,
): Promise<BillWithItems> {
  return { bill, items: await repo.listActiveItems(tenantId, bill.id) };
}

export async function syncBillTotals(
  repo: BillingRepo,
  tenantId: string,
  bill: BillRow,
): Promise<BillRow | undefined> {
  const items = await repo.listActiveItems(tenantId, bill.id);
  return repo.updateBill(tenantId, bill.id, rollupBillTotals(bill, items));
}

export function requireStatus(
  status: string,
  allowed: readonly string[],
  message: string,
): UseCaseResult<never> | null {
  return allowed.includes(status) ? null : fail("CONFLICT", message);
}
