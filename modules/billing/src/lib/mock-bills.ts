import type { BillRow } from "../domain/bill.types.js";

const MOCK_TS = "2026-05-15T00:00:00.000Z";
const tenantId = "00000000-0000-0000-0000-000000000007";
const patientId = "11111111-1111-1111-1111-111111111111";

function bill(
  id: string,
  billNumber: string,
  status: BillRow["status"],
  net: string,
  paid: string,
  outstanding: string,
): BillRow {
  return {
    id,
    iq_tenant_id: tenantId,
    bill_number: billNumber,
    patient_id: patientId,
    visit_id: "22222222-2222-2222-2222-222222222222",
    visit_type: "OPD",
    bill_type: "STANDALONE",
    bill_date: "2026-05-15",
    subtotal: net,
    discount_amount: "0.0000",
    discount_reason: null,
    tax_amount: "0.0000",
    total_amount: net,
    round_off_amount: "0.0000",
    net_amount: net,
    paid_amount: paid,
    outstanding_amount: outstanding,
    status,
    notes: null,
    cancellation_reason: null,
    created_by: null,
    approved_by: null,
    cancelled_by: null,
    created_at: MOCK_TS,
    updated_at: MOCK_TS,
    approved_at: status === "DRAFT" ? null : MOCK_TS,
    cancelled_at: null,
  };
}

function billWithTime(
  id: string,
  billNumber: string,
  status: BillRow["status"],
  net: string,
  paid: string,
  outstanding: string,
  createdAt: string,
): BillRow {
  return { ...bill(id, billNumber, status, net, paid, outstanding), created_at: createdAt, updated_at: createdAt };
}

export const MOCK_BILL_ROWS: BillRow[] = [
  billWithTime(
    "33333333-3333-4333-8333-333333333301",
    "BILL-2026-00001",
    "FINALIZED",
    "500.0000",
    "0.0000",
    "500.0000",
    "2026-05-15T10:00:00.000Z",
  ),
  billWithTime(
    "33333333-3333-4333-8333-333333333302",
    "BILL-2026-00002",
    "PAID",
    "100.0000",
    "100.0000",
    "0.0000",
    "2026-05-15T11:00:00.000Z",
  ),
  billWithTime(
    "33333333-3333-4333-8333-333333333303",
    "BILL-2026-00003",
    "DRAFT",
    "400.0000",
    "0.0000",
    "400.0000",
    "2026-05-15T12:00:00.000Z",
  ),
];

export function seedMockBills(target: BillRow[]): void {
  for (const row of MOCK_BILL_ROWS) {
    if (!target.some((b) => b.id === row.id)) target.push({ ...row });
  }
}
