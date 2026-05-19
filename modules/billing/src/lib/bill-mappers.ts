import type { billItems, bills, payments } from "../schema/tables.js";
import type { BillItemRow, BillRow, PaymentRow } from "../domain/bill.types.js";

function str(n: string | null | undefined): string {
  return n == null ? "0.0000" : String(n);
}

export function toBillRow(row: typeof bills.$inferSelect): BillRow {
  return {
    id: row.id,
    iq_tenant_id: row.iq_tenant_id,
    bill_number: row.bill_number,
    patient_id: row.patient_id,
    visit_id: row.visit_id,
    visit_type: row.visit_type,
    bill_type: row.bill_type,
    bill_date: String(row.bill_date),
    subtotal: str(row.subtotal),
    discount_amount: str(row.discount_amount),
    discount_reason: row.discount_reason,
    tax_amount: str(row.tax_amount),
    total_amount: str(row.total_amount),
    round_off_amount: str(row.round_off_amount),
    net_amount: str(row.net_amount),
    paid_amount: str(row.paid_amount),
    outstanding_amount: str(row.outstanding_amount),
    status: row.status as BillRow["status"],
    notes: row.notes,
    cancellation_reason: row.cancellation_reason,
    created_by: row.created_by,
    approved_by: row.approved_by,
    cancelled_by: row.cancelled_by,
    created_at: row.created_at.toISOString(),
    updated_at: row.updated_at.toISOString(),
    approved_at: row.approved_at?.toISOString() ?? null,
    cancelled_at: row.cancelled_at?.toISOString() ?? null,
  };
}

export function toBillItemRow(row: typeof billItems.$inferSelect): BillItemRow {
  return {
    id: row.id,
    iq_tenant_id: row.iq_tenant_id,
    bill_id: row.bill_id,
    service_id: row.service_id,
    item_type: row.item_type,
    item_code: row.item_code,
    description: row.description,
    quantity: String(row.quantity),
    unit_price: str(row.unit_price),
    gross_amount: str(row.gross_amount),
    discount_percentage: str(row.discount_percentage),
    discount_amount: str(row.discount_amount),
    net_amount: str(row.net_amount),
    tax_percentage: str(row.tax_percentage),
    tax_amount: str(row.tax_amount),
    total_amount: str(row.total_amount),
    source_module: row.source_module,
    source_ref: row.source_ref,
    performed_date: row.performed_date?.toISOString() ?? null,
    performed_by: row.performed_by,
    department: row.department,
    status: row.status as BillItemRow["status"],
    idempotency_key: row.idempotency_key,
    notes: row.notes,
    created_at: row.created_at.toISOString(),
    updated_at: row.updated_at.toISOString(),
  };
}

export function toPaymentRow(row: typeof payments.$inferSelect): PaymentRow {
  return {
    id: row.id,
    iq_tenant_id: row.iq_tenant_id,
    payment_number: row.payment_number,
    receipt_number: row.receipt_number,
    bill_id: row.bill_id,
    patient_id: row.patient_id,
    payment_date: row.payment_date.toISOString(),
    amount: str(row.amount),
    payment_method: row.payment_method as PaymentRow["payment_method"],
    transaction_id: row.transaction_id,
    reference_number: row.reference_number,
    status: row.status as PaymentRow["status"],
    received_by: row.received_by,
    notes: row.notes,
    created_at: row.created_at.toISOString(),
    updated_at: row.updated_at.toISOString(),
  };
}
