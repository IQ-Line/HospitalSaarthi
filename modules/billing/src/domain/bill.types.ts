export type BillStatus =
  | "DRAFT"
  | "FINALIZED"
  | "PARTIALLY_PAID"
  | "PAID"
  | "CLOSED"
  | "CANCELLED"
  | "REPLACED";

export type PaymentMethod = "CASH" | "CARD" | "UPI" | "CHEQUE" | "BANK_TRANSFER";

export type UseCaseErrorCode = "NOT_FOUND" | "CONFLICT" | "VALIDATION" | "FORBIDDEN";

export type UseCaseResult<T> =
  | { ok: true; data: T }
  | { ok: false; code: UseCaseErrorCode; message: string };

export interface BillRow {
  id: string;
  iq_tenant_id: string;
  bill_number: string;
  patient_id: string;
  visit_id: string | null;
  visit_type: string | null;
  bill_type: string;
  bill_date: string;
  subtotal: string;
  discount_amount: string;
  discount_reason: string | null;
  tax_amount: string;
  total_amount: string;
  round_off_amount: string;
  net_amount: string;
  paid_amount: string;
  outstanding_amount: string;
  status: BillStatus;
  notes: string | null;
  cancellation_reason: string | null;
  created_by: string | null;
  approved_by: string | null;
  cancelled_by: string | null;
  created_at: string;
  updated_at: string;
  approved_at: string | null;
  cancelled_at: string | null;
}

export interface BillItemRow {
  id: string;
  iq_tenant_id: string;
  bill_id: string;
  service_id: string | null;
  item_type: string;
  item_code: string;
  description: string;
  quantity: string;
  unit_price: string;
  gross_amount: string;
  discount_percentage: string;
  discount_amount: string;
  net_amount: string;
  tax_percentage: string;
  tax_amount: string;
  total_amount: string;
  source_module: string;
  source_ref: string | null;
  performed_date: string | null;
  performed_by: string | null;
  department: string | null;
  status: "ACTIVE" | "VOIDED";
  idempotency_key: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface PaymentRow {
  id: string;
  iq_tenant_id: string;
  payment_number: string;
  receipt_number: string | null;
  bill_id: string | null;
  patient_id: string;
  payment_date: string;
  amount: string;
  payment_method: PaymentMethod;
  transaction_id: string | null;
  reference_number: string | null;
  status: "SUCCESS" | "FAILED" | "VOIDED";
  received_by: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface BillWithItems {
  bill: BillRow;
  items: BillItemRow[];
}

export interface CaptureChargeInput {
  patient_id: string;
  visit_id?: string | null;
  visit_type?: string | null;
  source_module: string;
  source_ref?: string | null;
  item_code: string;
  provider_id?: string | null;
  quantity?: number | string;
  /** Desk override — requires catalog row + override permission; must be > 0 when set. */
  unit_price_override?: number | null;
  tax_percentage_override?: number | null;
  line_discount_amount?: number | null;
  line_discount_percentage?: number | null;
  performed_by?: string | null;
  performed_date?: string | null;
  department?: string | null;
  notes?: string | null;
}

export interface ChargeIngestResponse {
  bill_item_id: string;
  bill_id: string;
  snapshotted_unit_price: string;
  snapshotted_tax_percentage: string;
  snapshotted_description: string;
  gross_amount: string;
  tax_amount: string;
  net_amount: string;
  replayed: boolean;
}

export interface ApplyBillDiscountInput {
  discount_amount: string | number;
  discount_reason?: string | null;
}

export interface RecordPaymentInput {
  bill_id: string;
  amount: string | number;
  payment_method: PaymentMethod;
  payment_date?: string | null;
  transaction_id?: string | null;
  reference_number?: string | null;
  received_by?: string | null;
  notes?: string | null;
}

export interface CancelBillInput {
  reason: string;
  notes?: string | null;
}

export interface ListBillsQuery {
  patient_id?: string;
  visit_id?: string;
  source_module?: string;
  source_ref?: string;
  status?: BillStatus;
  bill_type?: string;
  from_date?: string;
  to_date?: string;
  limit?: number;
  cursor?: string;
}

export interface ListBillsResult {
  data: BillRow[];
  page: { limit: number; next_cursor: string | null };
}
