import { apiClient } from '@/lib/api-client';

const BASE = '/api/billing/v1';

export type BillingPaymentMethod = 'CASH' | 'CARD' | 'UPI' | 'CHEQUE' | 'BANK_TRANSFER';

export interface CaptureChargeInput {
  patient_id: string;
  visit_id?: string | null;
  visit_type?: string;
  source_module: string;
  source_ref?: string | null;
  item_code: string;
  provider_id?: string | null;
  quantity?: number;
  /** Desk-entered unit price (overrides tariff catalog for this charge line). */
  unit_price_override?: number;
  tax_percentage_override?: number;
  line_discount_amount?: number;
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

export interface RecordPaymentInput {
  bill_id: string;
  amount: number;
  payment_method: BillingPaymentMethod;
  notes?: string | null;
}

export interface RecordPaymentResponse {
  payment_id: string;
  receipt_number: string | null;
  bill_status: string;
}

function idempotencyHeaders(key: string): HeadersInit {
  return { 'Idempotency-Key': key };
}

export function captureCharge(
  input: CaptureChargeInput,
  idempotencyKey: string,
): Promise<ChargeIngestResponse> {
  return apiClient<ChargeIngestResponse>(`${BASE}/charges`, {
    method: 'POST',
    headers: idempotencyHeaders(idempotencyKey),
    body: JSON.stringify(input),
  });
}

export function applyBillDiscount(
  billId: string,
  discount_amount: number,
  discount_reason?: string,
  idempotencyKey?: string,
): Promise<unknown> {
  return apiClient(`${BASE}/bills/${billId}`, {
    method: 'PATCH',
    headers: idempotencyKey ? idempotencyHeaders(idempotencyKey) : undefined,
    body: JSON.stringify({
      discount_amount,
      discount_reason: discount_reason ?? null,
    }),
  });
}

export function finalizeBill(billId: string): Promise<unknown> {
  return apiClient(`${BASE}/bills/${billId}/finalize`, {
    method: 'POST',
    body: JSON.stringify({}),
  });
}

export function recordPayment(
  input: RecordPaymentInput,
  idempotencyKey: string,
): Promise<RecordPaymentResponse> {
  return apiClient<RecordPaymentResponse>(`${BASE}/payments`, {
    method: 'POST',
    headers: idempotencyHeaders(idempotencyKey),
    body: JSON.stringify(input),
  });
}

/** Map visit-registration payment mode to billing API enum. */
export function billingPaymentMethod(
  mode: string | undefined,
): BillingPaymentMethod | null {
  switch (mode?.trim().toLowerCase()) {
    case 'cash':
      return 'CASH';
    case 'card':
      return 'CARD';
    case 'upi':
      return 'UPI';
    default:
      return null;
  }
}
