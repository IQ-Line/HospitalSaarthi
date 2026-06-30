import type { BillingWritePort } from "../ports.js";
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
  const hasProvider = Boolean(providerId);

  const chargeBase = {
    patient_id: ctx.patient_id,
    visit_id: ctx.visit_id,
    visit_type: "OPD" as const,
    source_module: REGISTRATION_SOURCE_MODULE,
    source_ref: ctx.registration_id,
  };

  const regItemCode = billing.registration_fee?.item_code?.trim() || null;
  let billId: string | null = null;

  if (regItemCode) {
    const regDiscount = billing.registration_fee?.line_discount_percentage ?? 0;
    const regCharge = await billingWritePort.captureCharge(
      tenantId,
      {
        ...chargeBase,
        item_code: regItemCode,
        provider_id: null,
        ...(regDiscount > 0 ? { line_discount_percentage: regDiscount } : {}),
      },
      `${ctx.idempotencyKey}:reg-fee`,
      ctx.bearerToken,
    );
    billId = regCharge.bill_id;
  }

  const consultItemCode = billing.consultation_fee?.item_code?.trim() || null;
  if (hasProvider && consultItemCode) {
    const consultDiscount = billing.consultation_fee?.line_discount_percentage ?? 0;
    const consultCharge = await billingWritePort.captureCharge(
      tenantId,
      {
        ...chargeBase,
        item_code: consultItemCode,
        provider_id: providerId,
        department: departmentName,
        ...(consultDiscount > 0 ? { line_discount_percentage: consultDiscount } : {}),
      },
      `${ctx.idempotencyKey}:consult`,
      ctx.bearerToken,
    );
    if (billId && consultCharge.bill_id !== billId) {
      throw new BillingWriteError(
        "Registration billing: charges landed on different bills",
        500,
        "billing_split_bill",
      );
    }
    billId = consultCharge.bill_id;
  }

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

  try {
    await billingWritePort.finalizeBill(tenantId, billId, ctx.bearerToken);
  } catch (err) {
    if (
      err instanceof BillingWriteError &&
      err.code === "billing_bill_not_draft"
    ) {
      // Idempotent replay — bill already finalized.
    } else {
      throw err;
    }
  }

  const paid = billing.amount_paid ?? 0;
  if (paid > 0) {
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

  return billId;
}
