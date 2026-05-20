import { BILLING_SOURCE_MODULE } from '@/features/billing/constants';
import {
  applyBillDiscount,
  billingPaymentMethod,
  captureCharge,
  finalizeBill,
  recordPayment,
} from '@/features/billing/api/transactions';
import type { CaptureChargeInput } from '@/features/billing/api/transactions';
import type {
  CreateVisitRequestBody,
  VisitRegistrationBillingFeeLine,
} from '@/features/frontdesk/types';

function deskPricing(
  line: VisitRegistrationBillingFeeLine | undefined,
): Pick<
  CaptureChargeInput,
  'unit_price_override' | 'tax_percentage_override' | 'line_discount_amount'
> {
  const fee = line ?? { unit_price: 0, tax_percent: 0, discount: 0 };
  return {
    unit_price_override: fee.unit_price,
    tax_percentage_override: fee.tax_percent,
    line_discount_amount: fee.discount ?? 0,
  };
}

export interface VisitRegistrationBillingResult {
  bill_id: string;
}

/**
 * Registration desk billing: charges → optional discount → finalize → optional payment.
 * Rack `CONS_GENERAL` (`provider_id: null`) until provider-specific tariffs — TODO(HIMS): wire provider tariffs.
 */
export async function executeVisitRegistrationBilling(
  form: CreateVisitRequestBody,
  ctx: {
    patient_id: string;
    registration_id: string;
    visit_id: string | null;
    idempotencyKey: string;
  },
): Promise<VisitRegistrationBillingResult> {
  const billing = form.billing;
  const hasProvider = Boolean(form.appointment?.provider_id?.trim());
  // visits-svc not wired yet — group draft bill by registration id when visit_id is null
  const visitRef = ctx.visit_id ?? ctx.registration_id;

  const chargeBase = {
    patient_id: ctx.patient_id,
    visit_id: visitRef,
    visit_type: 'OPD' as const,
    source_module: BILLING_SOURCE_MODULE.REGISTRATION,
    source_ref: ctx.registration_id,
    provider_id: null,
  };

  const regCharge = await captureCharge(
    { ...chargeBase, item_code: 'REG_FEE', ...deskPricing(billing?.registration_fee) },
    `${ctx.idempotencyKey}:reg-fee`,
  );

  let billId = regCharge.bill_id;

  if (hasProvider) {
    const consultCharge = await captureCharge(
      { ...chargeBase, item_code: 'CONS_GENERAL', ...deskPricing(billing?.consultation_fee) },
      `${ctx.idempotencyKey}:consult`,
    );
    if (consultCharge.bill_id !== regCharge.bill_id) {
      throw new Error(
        `Registration billing: charges on different bills (${regCharge.bill_id} vs ${consultCharge.bill_id})`,
      );
    }
    billId = consultCharge.bill_id;
  }

  const invoiceDiscount = billing?.invoice_discount ?? 0;
  if (invoiceDiscount > 0) {
    await applyBillDiscount(
      billId,
      invoiceDiscount,
      'Visit registration invoice discount',
      `${ctx.idempotencyKey}:discount`,
    );
  }

  await finalizeBill(billId);

  const paid = billing?.amount_paid ?? 0;
  if (paid > 0) {
    const payment_method = billingPaymentMethod(billing?.payment_mode);
    if (!payment_method) {
      throw new Error('Select cash, card, or UPI when recording an amount paid.');
    }
    await recordPayment(
      { bill_id: billId, amount: paid, payment_method, notes: 'Visit registration payment' },
      `${ctx.idempotencyKey}:payment`,
    );
  }

  return { bill_id: billId };
}
