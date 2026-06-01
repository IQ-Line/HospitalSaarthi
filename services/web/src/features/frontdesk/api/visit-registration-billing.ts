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

function lineDiscountFields(
  line: VisitRegistrationBillingFeeLine | undefined,
): Pick<CaptureChargeInput, 'line_discount_amount' | 'line_discount_percentage'> {
  const fields: Pick<CaptureChargeInput, 'line_discount_amount' | 'line_discount_percentage'> = {};
  const discountPct = line?.discount_percent ?? 0;
  const discountAmt = line?.discount ?? 0;
  if (discountPct > 0) fields.line_discount_percentage = discountPct;
  if (discountAmt > 0) fields.line_discount_amount = discountAmt;
  return fields;
}

function requireItemCode(
  line: VisitRegistrationBillingFeeLine | undefined,
  label: string,
): string {
  const code = line?.item_code?.trim();
  if (!code) {
    throw new Error(`${label}: no tariff service code — check tariff master for this tenant.`);
  }
  return code;
}

export interface VisitRegistrationBillingResult {
  bill_id: string;
}

/**
 * Registration desk billing: catalog-backed charges → optional discount → finalize → optional payment.
 * Prices come from tariff_master; only line discounts are sent as desk overrides when &gt; 0.
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
  const appointment = form.appointment;
  const providerId = appointment?.provider_id?.trim() || null;
  const departmentName = appointment?.department_name?.trim() || null;
  const hasProvider = Boolean(providerId);
  const visitRef = ctx.visit_id ?? ctx.registration_id;

  const chargeBase = {
    patient_id: ctx.patient_id,
    visit_id: visitRef,
    visit_type: 'OPD' as const,
    source_module: BILLING_SOURCE_MODULE.REGISTRATION,
    source_ref: ctx.registration_id,
  };

  // Registration fee applies on first visit only.
  const visitTypeCode = appointment?.visit_type_code?.trim() || null;
  const isFirstVisit = visitTypeCode === 'opd_first';
  const regItemCode =
    isFirstVisit ? billing?.registration_fee?.item_code?.trim() || null : null;
  let billId: string | null = null;

  if (regItemCode) {
    const regCharge = await captureCharge(
      {
        ...chargeBase,
        item_code: regItemCode,
        provider_id: null,
        ...lineDiscountFields(billing?.registration_fee),
      },
      `${ctx.idempotencyKey}:reg-fee`,
    );
    billId = regCharge.bill_id;
  }

  const consultItemCode = billing?.consultation_fee?.item_code?.trim() || null;
  const consultDepartmentId = billing?.consultation_fee?.department_id?.trim() || null;
  const consultTypeId = billing?.consultation_fee?.consultation_type_id?.trim() || null;
  const useConsultationPath =
    hasProvider && Boolean(consultDepartmentId) && Boolean(consultTypeId);

  if (useConsultationPath) {
    const consultCharge = await captureCharge(
      {
        ...chargeBase,
        provider_id: providerId,
        department_id: consultDepartmentId,
        consultation_type_id: consultTypeId,
        department: departmentName,
        ...lineDiscountFields(billing?.consultation_fee),
      },
      `${ctx.idempotencyKey}:consult`,
    );
    if (billId && consultCharge.bill_id !== billId) {
      throw new Error(
        `Registration billing: charges on different bills (${billId} vs ${consultCharge.bill_id})`,
      );
    }
    billId = consultCharge.bill_id;
  } else if (hasProvider && consultItemCode) {
    const consultCharge = await captureCharge(
      {
        ...chargeBase,
        item_code: consultItemCode,
        provider_id: providerId,
        department: departmentName,
        ...lineDiscountFields(billing?.consultation_fee),
      },
      `${ctx.idempotencyKey}:consult`,
    );
    if (billId && consultCharge.bill_id !== billId) {
      throw new Error(
        `Registration billing: charges on different bills (${billId} vs ${consultCharge.bill_id})`,
      );
    }
    billId = consultCharge.bill_id;
  }

  // TODO: re-enable throw when tariff gates are restored.
  if (!billId) {
    return { bill_id: '' };
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
