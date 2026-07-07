import type { BillingCaptureChargeInput, BillingWritePort } from "../ports.js";
import { BillingWriteError } from "./billing-write-error.js";

const REGISTRATION_SOURCE_MODULE = "registration";

export interface OpdRegistrationBillingLine {
  item_code?: string | null;
  line_discount_percentage?: number;
}

export interface OpdRegistrationBillingPayload {
  registration_fee?: OpdRegistrationBillingLine | null;
  consultation_fee?: OpdRegistrationBillingLine | null;
  department_name?: string | null;
  invoice_discount?: number;
  amount_paid?: number;
  payment_method?: "CASH" | "CARD" | "UPI" | "CHEQUE" | "BANK_TRANSFER" | null;
  payment_notes?: string | null;
}

/** Fields shared by every charge a single registration produces. */
type ChargeBase = Pick<
  BillingCaptureChargeInput,
  "patient_id" | "visit_id" | "visit_type" | "source_module" | "source_ref"
>;

type BillingCtx = { idempotencyKey: string; bearerToken?: string };

/**
 * Capture the registration fee charge (if a line item is present) and return
 * the bill it landed on. Returns null when there is no registration fee line.
 */
async function captureRegistrationCharge(
  billingWritePort: BillingWritePort,
  tenantId: string,
  chargeBase: ChargeBase,
  ctx: BillingCtx,
  line: OpdRegistrationBillingLine | null | undefined,
): Promise<string | null> {
  const itemCode = line?.item_code?.trim() || null;
  if (!itemCode) return null;

  const discount = line?.line_discount_percentage ?? 0;
  const charge = await billingWritePort.captureCharge(
    tenantId,
    {
      ...chargeBase,
      item_code: itemCode,
      provider_id: null,
      ...(discount > 0 ? { line_discount_percentage: discount } : {}),
    },
    `${ctx.idempotencyKey}:reg-fee`,
    ctx.bearerToken,
  );
  return charge.bill_id;
}

/**
 * Capture the consultation fee charge when a provider and a line item are both
 * present, returning the (possibly newly created) bill id. When no consultation
 * charge applies, the incoming `currentBillId` is returned unchanged. Throws if
 * the consultation charge lands on a different bill than the registration fee.
 */
async function captureConsultationCharge(
  billingWritePort: BillingWritePort,
  tenantId: string,
  chargeBase: ChargeBase,
  ctx: BillingCtx,
  line: OpdRegistrationBillingLine | null | undefined,
  provider: { providerId: string | null; departmentName: string | null },
  currentBillId: string | null,
): Promise<string | null> {
  const itemCode = line?.item_code?.trim() || null;
  if (!provider.providerId || !itemCode) return currentBillId;

  const discount = line?.line_discount_percentage ?? 0;
  const charge = await billingWritePort.captureCharge(
    tenantId,
    {
      ...chargeBase,
      item_code: itemCode,
      provider_id: provider.providerId,
      department: provider.departmentName,
      ...(discount > 0 ? { line_discount_percentage: discount } : {}),
    },
    `${ctx.idempotencyKey}:consult`,
    ctx.bearerToken,
  );
  if (currentBillId && charge.bill_id !== currentBillId) {
    throw new BillingWriteError(
      "Registration billing: charges landed on different bills",
      500,
      "billing_split_bill",
    );
  }
  return charge.bill_id;
}

/**
 * Finalize the bill, tolerating the idempotent-replay case where it has already
 * been finalized (a `billing_bill_not_draft` error).
 */
async function finalizeRegistrationBill(
  billingWritePort: BillingWritePort,
  tenantId: string,
  billId: string,
  bearerToken?: string,
): Promise<void> {
  try {
    await billingWritePort.finalizeBill(tenantId, billId, bearerToken);
  } catch (err) {
    if (err instanceof BillingWriteError && err.code === "billing_bill_not_draft") {
      // Idempotent replay — bill already finalized.
      return;
    }
    throw err;
  }
}

/**
 * Record the up-front payment when a positive amount was collected. Requires a
 * payment method to be present alongside a non-zero amount.
 */
async function recordRegistrationPayment(
  billingWritePort: BillingWritePort,
  tenantId: string,
  billId: string,
  ctx: BillingCtx,
  billing: OpdRegistrationBillingPayload,
): Promise<void> {
  const paid = billing.amount_paid ?? 0;
  if (paid <= 0) return;

  const paymentMethod = billing.payment_method;
  if (!paymentMethod) {
    throw new BillingWriteError(
      "payment_method is required when amount_paid is greater than zero",
      400,
      "billing_payment_method_required",
    );
  }
  await billingWritePort.recordPayment(
    tenantId,
    {
      bill_id: billId,
      amount: paid,
      payment_method: paymentMethod,
      notes: billing.payment_notes?.trim() || "Visit registration payment",
    },
    `${ctx.idempotencyKey}:payment`,
    ctx.bearerToken,
  );
}

export async function executeOpdRegistrationBilling(
  billingWritePort: BillingWritePort,
  tenantId: string,
  ctx: {
    patient_id: string;
    registration_id: string;
    visit_id: string;
    doctor_id?: string | null;
    idempotencyKey: string;
    bearerToken?: string;
  },
  billing: OpdRegistrationBillingPayload,
): Promise<string | null> {
  const providerId = ctx.doctor_id?.trim() || null;
  const departmentName = billing.department_name?.trim() || null;

  const chargeBase: ChargeBase = {
    patient_id: ctx.patient_id,
    visit_id: ctx.visit_id,
    visit_type: "OPD",
    source_module: REGISTRATION_SOURCE_MODULE,
    source_ref: ctx.registration_id,
  };

  let billId = await captureRegistrationCharge(
    billingWritePort,
    tenantId,
    chargeBase,
    ctx,
    billing.registration_fee,
  );
  billId = await captureConsultationCharge(
    billingWritePort,
    tenantId,
    chargeBase,
    ctx,
    billing.consultation_fee,
    { providerId, departmentName },
    billId,
  );

  if (!billId) {
    return null;
  }

  const invoiceDiscount = billing.invoice_discount ?? 0;
  if (invoiceDiscount > 0) {
    await billingWritePort.applyBillDiscount(
      tenantId,
      billId,
      invoiceDiscount,
      "Visit registration invoice discount",
      ctx.bearerToken,
    );
  }

  await finalizeRegistrationBill(billingWritePort, tenantId, billId, ctx.bearerToken);
  await recordRegistrationPayment(billingWritePort, tenantId, billId, ctx, billing);

  return billId;
}
