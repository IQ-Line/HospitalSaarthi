const counters = new Map<string, { bill: number; payment: number; receipt: number }>();

function dayKey(): string {
  return new Date().toISOString().slice(0, 10).replace(/-/g, "");
}

function next(tenantId: string, kind: "bill" | "payment" | "receipt"): number {
  const key = `${tenantId}:${dayKey()}`;
  const c = counters.get(key) ?? { bill: 0, payment: 0, receipt: 0 };
  c[kind] += 1;
  counters.set(key, c);
  return c[kind];
}

function pad(n: number, len = 6): string {
  return String(n).padStart(len, "0");
}

export function nextBillNumber(tenantId: string): string {
  return `B-${tenantId.slice(0, 8)}-${dayKey()}-${pad(next(tenantId, "bill"))}`;
}

export function nextPaymentNumber(tenantId: string): string {
  return `P-${tenantId.slice(0, 8)}-${dayKey()}-${pad(next(tenantId, "payment"))}`;
}

export function nextReceiptNumber(tenantId: string): string {
  return `R-${tenantId.slice(0, 8)}-${dayKey()}-${pad(next(tenantId, "receipt"))}`;
}
