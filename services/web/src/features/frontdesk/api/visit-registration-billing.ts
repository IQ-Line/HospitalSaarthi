import {
  applyBillDiscount,
  billingPaymentMethod,
  captureCharge,
  finalizeBill,
  recordPayment,
} from '@/features/billing/api/transactions';
import type { CreateVisitRequestBody } from '@/features/frontdesk/types';

const SOURCE_MODULE = 'registration';

export interface VisitRegistrationBillingResult {
  bill_id: string;
}

/**
 * OPD registration desk billing: charges → optional bill discount → finalize → optional payment.
 * Tariff codes: `REG_FEE`, `CONS_GENERAL` (when a provider is selected).
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

  const visitRef = ctx.visit_id ?? ctx.registration_id;

  const regCharge = await captureCharge(
    {
      patient_id: ctx.patient_id,
      visit_id: visitRef,
      visit_type: 'OPD',
      source_module: SOURCE_MODULE,
      source_ref: ctx.registration_id,
      item_code: 'REG_FEE',
      notes: 'Registration fee',
    },
    `${ctx.idempotencyKey}:reg-fee`,
  );

  let billId = regCharge.bill_id;

  // Rack rate only (provider_id null) until provider-specific tariffs exist in tariff_master.
  if (hasProvider) {
    const consultCharge = await captureCharge(
      {
        patient_id: ctx.patient_id,
        visit_id: visitRef,
        visit_type: 'OPD',
        source_module: SOURCE_MODULE,
        source_ref: ctx.registration_id,
        item_code: 'CONS_GENERAL',
        notes: 'Consultation fee',
      },
      `${ctx.idempotencyKey}:consult`,
    );
    billId = consultCharge.bill_id;
  }

  const invoiceDiscount = billing?.invoice_discount ?? 0;
  if (invoiceDiscount > 0) {
    await applyBillDiscount(billId, invoiceDiscount, 'Visit registration invoice discount');
  }

  await finalizeBill(billId);

  const paid = billing?.amount_paid ?? 0;
  if (paid > 0) {
    const payment_method = billingPaymentMethod(billing?.payment_mode);
    if (!payment_method) {
      throw new Error('Select a payment mode when recording an amount paid.');
    }
    await recordPayment(
      {
        bill_id: billId,
        amount: paid,
        payment_method,
        notes: 'Visit registration payment',
      },
      `${ctx.idempotencyKey}:payment`,
    );
  }

  return { bill_id: billId };
}
