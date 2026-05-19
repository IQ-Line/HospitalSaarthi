import { randomUUID } from "node:crypto";
import { and, eq, isNull, type DbInstance } from "@hims/ts-sdk-db";
import { billItems, bills, payments } from "../schema/tables.js";
import type { BillItemRow, BillRow, BillWithItems, PaymentRow } from "../domain/bill.types.js";
import type { BillingRepo, NewBillItemRow, NewBillRow, NewPaymentRow } from "../ports.js";
import { toBillItemRow, toBillRow, toPaymentRow } from "../lib/bill-mappers.js";
import { nextBillNumber } from "../lib/bill-numbers.js";

const isoDate = (v: string | null | undefined) => (v ? new Date(v) : null);

class DrizzleBillingRepo implements BillingRepo {
  constructor(private readonly db: DbInstance) {}

  async findItemByIdempotency(tenantId: string, key: string) {
    const [row] = await this.db
      .select()
      .from(billItems)
      .where(and(eq(billItems.iq_tenant_id, tenantId), eq(billItems.idempotency_key, key)))
      .limit(1);
    return row ? toBillItemRow(row) : undefined;
  }

  async findDraftBill(tenantId: string, patientId: string, visitId: string | null) {
    const conds = [
      eq(bills.iq_tenant_id, tenantId),
      eq(bills.patient_id, patientId),
      eq(bills.status, "DRAFT"),
    ];
    if (visitId) conds.push(eq(bills.visit_id, visitId));
    else conds.push(isNull(bills.visit_id));

    const [row] = await this.db
      .select()
      .from(bills)
      .where(and(...conds))
      .limit(1);
    return row ? toBillRow(row) : undefined;
  }

  async getBill(tenantId: string, billId: string): Promise<BillWithItems | undefined> {
    const [bill] = await this.db
      .select()
      .from(bills)
      .where(and(eq(bills.iq_tenant_id, tenantId), eq(bills.id, billId)))
      .limit(1);
    if (!bill) return undefined;
    const items = await this.db
      .select()
      .from(billItems)
      .where(and(eq(billItems.iq_tenant_id, tenantId), eq(billItems.bill_id, billId)));
    return { bill: toBillRow(bill), items: items.map(toBillItemRow) };
  }

  async createBill(input: NewBillRow) {
    const [row] = await this.db.insert(bills).values(input).returning();
    if (!row) throw new Error("createBill insert failed");
    return toBillRow(row);
  }

  async insertItem(input: NewBillItemRow) {
    const [row] = await this.db
      .insert(billItems)
      .values({ ...input, performed_date: isoDate(input.performed_date) })
      .returning();
    if (!row) throw new Error("insertItem insert failed");
    return toBillItemRow(row);
  }

  async updateBill(tenantId: string, billId: string, patch: Partial<BillRow>) {
    const values: Record<string, unknown> = { updated_at: new Date() };
    for (const [k, v] of Object.entries(patch)) {
      if (v === undefined || k === "id" || k === "iq_tenant_id") continue;
      if (k.endsWith("_at") && v) values[k] = new Date(v as string);
      else values[k] = v;
    }
    const [row] = await this.db
      .update(bills)
      .set(values)
      .where(and(eq(bills.iq_tenant_id, tenantId), eq(bills.id, billId)))
      .returning();
    return row ? toBillRow(row) : undefined;
  }

  async listActiveItems(tenantId: string, billId: string) {
    const rows = await this.db
      .select()
      .from(billItems)
      .where(
        and(
          eq(billItems.iq_tenant_id, tenantId),
          eq(billItems.bill_id, billId),
          eq(billItems.status, "ACTIVE"),
        ),
      );
    return rows.map(toBillItemRow);
  }

  async insertPayment(input: NewPaymentRow) {
    const [row] = await this.db
      .insert(payments)
      .values({ ...input, payment_date: new Date(input.payment_date) })
      .returning();
    if (!row) throw new Error("insertPayment insert failed");
    return toPaymentRow(row);
  }
}

class InMemoryBillingRepo implements BillingRepo {
  constructor(
    private readonly bills: BillRow[],
    private readonly items: BillItemRow[],
    private readonly pays: PaymentRow[],
  ) {}

  async findItemByIdempotency(tenantId: string, key: string) {
    return this.items.find((i) => i.iq_tenant_id === tenantId && i.idempotency_key === key);
  }

  async findDraftBill(tenantId: string, patientId: string, visitId: string | null) {
    return this.bills.find(
      (b) =>
        b.iq_tenant_id === tenantId &&
        b.patient_id === patientId &&
        b.status === "DRAFT" &&
        (visitId ? b.visit_id === visitId : b.visit_id === null),
    );
  }

  async getBill(tenantId: string, billId: string) {
    const bill = this.bills.find((b) => b.iq_tenant_id === tenantId && b.id === billId);
    if (!bill) return undefined;
    return {
      bill,
      items: this.items.filter((i) => i.iq_tenant_id === tenantId && i.bill_id === billId),
    };
  }

  async createBill(input: NewBillRow) {
    const now = new Date().toISOString();
    const row: BillRow = { ...input, id: randomUUID(), created_at: now, updated_at: now };
    this.bills.push(row);
    return row;
  }

  async insertItem(input: NewBillItemRow) {
    const now = new Date().toISOString();
    const row: BillItemRow = { ...input, id: randomUUID(), created_at: now, updated_at: now };
    this.items.push(row);
    return row;
  }

  async updateBill(tenantId: string, billId: string, patch: Partial<BillRow>) {
    const i = this.bills.findIndex((b) => b.iq_tenant_id === tenantId && b.id === billId);
    if (i < 0) return undefined;
    const prev = this.bills[i];
    if (!prev) return undefined;
    const next = { ...prev, ...patch, updated_at: new Date().toISOString() };
    this.bills[i] = next;
    return next;
  }

  async listActiveItems(tenantId: string, billId: string) {
    return this.items.filter(
      (i) => i.iq_tenant_id === tenantId && i.bill_id === billId && i.status === "ACTIVE",
    );
  }

  async insertPayment(input: NewPaymentRow) {
    const now = new Date().toISOString();
    const row: PaymentRow = { ...input, id: randomUUID(), created_at: now, updated_at: now };
    this.pays.push(row);
    return row;
  }
}

export function createBillingRepo(db: DbInstance): BillingRepo {
  return new DrizzleBillingRepo(db);
}

export function createInMemoryBillingRepo(): {
  repo: BillingRepo;
  bills: BillRow[];
  items: BillItemRow[];
  payments: PaymentRow[];
} {
  const bills: BillRow[] = [];
  const items: BillItemRow[] = [];
  const payments: PaymentRow[] = [];
  return { repo: new InMemoryBillingRepo(bills, items, payments), bills, items, payments };
}

export function newDraftBill(
  tenantId: string,
  patientId: string,
  visitId: string | null,
  visitType: string | null,
  createdBy?: string | null,
): NewBillRow {
  const today = new Date().toISOString().slice(0, 10);
  return {
    iq_tenant_id: tenantId,
    bill_number: nextBillNumber(tenantId),
    patient_id: patientId,
    visit_id: visitId,
    visit_type: visitType,
    bill_type: "STANDALONE",
    bill_date: today,
    subtotal: "0.0000",
    discount_amount: "0.0000",
    discount_reason: null,
    tax_amount: "0.0000",
    total_amount: "0.0000",
    round_off_amount: "0.0000",
    net_amount: "0.0000",
    paid_amount: "0.0000",
    outstanding_amount: "0.0000",
    status: "DRAFT",
    notes: null,
    cancellation_reason: null,
    created_by: createdBy ?? null,
    approved_by: null,
    cancelled_by: null,
    approved_at: null,
    cancelled_at: null,
  };
}
