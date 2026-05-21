import { and, eq, ilike, sql, type DbInstance } from "@hims/ts-sdk-db";
import { bills, payments } from "../schema/tables.js";

const dayKey = () => new Date().toISOString().slice(0, 10).replace(/-/g, "");
const pad = (n: number) => String(n).padStart(6, "0");

function parseSeq(existing: string | undefined, prefix: string): number {
  if (!existing?.startsWith(prefix)) return 0;
  const n = Number.parseInt(existing.slice(prefix.length), 10);
  return Number.isFinite(n) ? n : 0;
}

async function nextSeq(
  db: DbInstance,
  table: typeof bills | typeof payments,
  numberCol: typeof bills.bill_number | typeof payments.payment_number,
  tenantId: string,
  prefix: string,
): Promise<string> {
  const [row] = await db
    .select({ number: numberCol })
    .from(table)
    .where(and(eq(table.iq_tenant_id, tenantId), ilike(numberCol, `${prefix}%`)))
    .orderBy(sql`${numberCol} desc`)
    .limit(1);
  return `${prefix}${pad(parseSeq(row?.number, prefix) + 1)}`;
}

export function billNumberPrefix(tenantId: string): string {
  return `B-${tenantId.slice(0, 8)}-${dayKey()}-`;
}

export const allocateBillNumber = (db: DbInstance, tenantId: string) =>
  nextSeq(db, bills, bills.bill_number, tenantId, billNumberPrefix(tenantId));

export const allocatePaymentNumber = (db: DbInstance, tenantId: string) =>
  nextSeq(db, payments, payments.payment_number, tenantId, `P-${tenantId.slice(0, 8)}-${dayKey()}-`);

export const allocateReceiptNumber = (db: DbInstance, tenantId: string) =>
  nextSeq(db, payments, payments.receipt_number, tenantId, `R-${tenantId.slice(0, 8)}-${dayKey()}-`);
