import { randomUUID } from "node:crypto";
import { and, eq, isNull, sql, type DbInstance } from "@hims/ts-sdk-db";
import { billItems, bills, payments } from "../schema/tables.js";
import type {
  BillItemRow,
  BillRow,
  BillWithItems,
  ListBillsQuery,
  ListBillsResult,
  PaymentRow,
} from "../domain/bill.types.js";
import type { BillingRepo, NewBillItemRow, NewBillRow, NewPaymentRow } from "../ports.js";
import {
  billListCursorCompare,
  clampBillListLimit,
  decodeBillListCursor,
  encodeBillListCursor,
} from "../lib/bill-list-pagination.js";
import {
  allocateBillNumber,
  allocatePaymentNumber,
  allocateReceiptNumber,
} from "../lib/allocate-sequence-number.js";
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
    const bill_number = await allocateBillNumber(this.db, input.iq_tenant_id);
    const [row] = await this.db.insert(bills).values({ ...input, bill_number }).returning();
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

  async listBills(tenantId: string, query: ListBillsQuery): Promise<ListBillsResult> {
    const limit = clampBillListLimit(query.limit);
    const cursor = decodeBillListCursor(query.cursor);
    const conditions = [eq(bills.iq_tenant_id, tenantId)];

    if (query.patient_id) conditions.push(eq(bills.patient_id, query.patient_id));
    if (query.visit_id) conditions.push(eq(bills.visit_id, query.visit_id));
    if (query.status) conditions.push(eq(bills.status, query.status));
    if (query.bill_type) conditions.push(eq(bills.bill_type, query.bill_type));
    if (query.from_date) conditions.push(sql`${bills.bill_date} >= ${query.from_date}`);
    if (query.to_date) conditions.push(sql`${bills.bill_date} <= ${query.to_date}`);
    if (cursor) {
      conditions.push(
        sql`(${bills.created_at}, ${bills.id}) < (${cursor.created_at}::timestamptz, ${cursor.id}::uuid)`,
      );
    }

    const rows = await this.db
      .select()
      .from(bills)
      .where(and(...conditions))
      .orderBy(sql`${bills.created_at} desc`, sql`${bills.id} desc`)
      .limit(limit + 1);

    const hasMore = rows.length > limit;
    const pageRows = hasMore ? rows.slice(0, limit) : rows;
    const last = pageRows.at(-1);

    return {
      data: pageRows.map(toBillRow),
      page: {
        limit,
        next_cursor: hasMore && last ? encodeBillListCursor(toBillRow(last)) : null,
      },
    };
  }

  async insertPayment(input: NewPaymentRow) {
    const payment_number = await allocatePaymentNumber(this.db, input.iq_tenant_id);
    const receipt_number =
      input.receipt_number ?? (await allocateReceiptNumber(this.db, input.iq_tenant_id));
    const [row] = await this.db
      .insert(payments)
      .values({
        ...input,
        payment_number,
        receipt_number,
        payment_date: new Date(input.payment_date),
      })
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

  async listBills(tenantId: string, query: ListBillsQuery): Promise<ListBillsResult> {
    const limit = clampBillListLimit(query.limit);
    const cursor = decodeBillListCursor(query.cursor);

    let rows = this.bills.filter((b) => b.iq_tenant_id === tenantId);
    if (query.patient_id) rows = rows.filter((b) => b.patient_id === query.patient_id);
    if (query.visit_id) rows = rows.filter((b) => b.visit_id === query.visit_id);
    if (query.status) rows = rows.filter((b) => b.status === query.status);
    if (query.bill_type) rows = rows.filter((b) => b.bill_type === query.bill_type);
    if (query.from_date) rows = rows.filter((b) => b.bill_date >= query.from_date!);
    if (query.to_date) rows = rows.filter((b) => b.bill_date <= query.to_date!);
    if (cursor) rows = rows.filter((b) => billListCursorCompare(b, cursor));

    rows.sort((a, b) => {
      if (a.created_at !== b.created_at) return b.created_at.localeCompare(a.created_at);
      return b.id.localeCompare(a.id);
    });

    const hasMore = rows.length > limit;
    const pageRows = hasMore ? rows.slice(0, limit) : rows;
    const last = pageRows.at(-1);

    return {
      data: pageRows,
      page: {
        limit,
        next_cursor: hasMore && last ? encodeBillListCursor(last) : null,
      },
    };
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
