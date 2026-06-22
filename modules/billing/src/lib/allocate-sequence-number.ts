import { type DbInstance } from "@hims/ts-sdk-db";
import { nextSequenceValue } from "@hims/ts-sdk-sequence";

const dayKey = () => new Date().toISOString().slice(0, 10).replace(/-/g, "");
const pad = (n: number) => String(n).padStart(6, "0");

/**
 * Atomic per-(tenant, kind, day) numbering via the shared sequence counter
 * (`nextSequenceValue` = INSERT ... ON CONFLICT DO UPDATE current_value + 1) —
 * the same atomic primitive bill_number uses through `allocateIdentifier`.
 *
 * Replaces the previous racy `SELECT max()+1`, which could hand two concurrent
 * payments the SAME payment/receipt number. A UNIQUE(iq_tenant_id, payment_number)
 * constraint on `billing.payments` is the defense-in-depth backstop.
 */
async function allocateDailyNumber(
  db: DbInstance,
  tenantId: string,
  kind: "P" | "R",
  counterName: string,
): Promise<string> {
  const day = dayKey();
  const seq = await nextSequenceValue(db, tenantId, `${counterName}:${day}`, 1);
  return `${kind}-${tenantId.slice(0, 8)}-${day}-${pad(seq)}`;
}

export const allocatePaymentNumber = (db: DbInstance, tenantId: string) =>
  allocateDailyNumber(db, tenantId, "P", "billing_payment");

export const allocateReceiptNumber = (db: DbInstance, tenantId: string) =>
  allocateDailyNumber(db, tenantId, "R", "billing_receipt");
