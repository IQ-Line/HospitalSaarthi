import {
  buildOpdSlipPatientNameLine,
  computeOPDBillingSummary,
  type OPDBillingReportPayload,
} from "@hims/registration-reports";
import type { RegistrationRecord } from "../domain/registration.types.js";
import type { BillingBillDetail, BillingReadPort } from "../ports.js";
import {
  buildReportLayoutConfig,
  formatPaymentMethodLabel,
  formatReceiptDateOfIssue,
  formatVisitNumberForSlip,
  type ReportDocumentContext,
} from "../lib/report-document-context.js";

export interface BuildOpdReceiptPayloadDeps {
  billingReadPort: BillingReadPort | undefined;
}

export type BuildOpdReceiptPayloadResult =
  | { ok: true; payload: OPDBillingReportPayload }
  | { ok: false; code: "BILL_NOT_FOUND" | "BILLING_UNAVAILABLE"; message: string };

function mapBillToLineItems(bill: BillingBillDetail) {
  return bill.items
    .filter((item) => item.status === "ACTIVE")
    .map((item) => ({
      serviceName: item.description,
      serviceDetail: item.department?.trim() || undefined,
      quantity: Number.parseFloat(item.quantity) || 0,
      unitPrice: Number.parseFloat(item.unit_price) || 0,
      gstPercent: Number.parseFloat(item.tax_percentage) || 0,
      discount: Number.parseFloat(item.discount_amount) || 0,
    }));
}

export async function buildOpdReceiptPayload(
  deps: BuildOpdReceiptPayloadDeps,
  tenantId: string,
  record: RegistrationRecord,
  billId: string,
  context?: ReportDocumentContext,
): Promise<BuildOpdReceiptPayloadResult> {
  if (!deps.billingReadPort) {
    return { ok: false, code: "BILLING_UNAVAILABLE", message: "Billing service not configured" };
  }

  const billDetail = await deps.billingReadPort.getBill(tenantId, billId, {
    bearerToken: context?.bearerToken,
  });
  if (!billDetail) {
    return { ok: false, code: "BILL_NOT_FOUND", message: "Bill not found for this registration" };
  }

  const lineItems = mapBillToLineItems(billDetail);
  const billLevelDiscount = Number.parseFloat(billDetail.bill.discount_amount) || 0;
  const receivedAmount = Number.parseFloat(billDetail.bill.paid_amount) || 0;
  const summary = computeOPDBillingSummary(lineItems, billLevelDiscount, receivedAmount);

  const visitNumber = formatVisitNumberForSlip(record);
  const nameLine = buildOpdSlipPatientNameLine({
    firstName: record.patient_full_name,
    dateOfBirth: record.patient_date_of_birth ?? undefined,
    gender: record.patient_gender ?? undefined,
  });

  const payload: OPDBillingReportPayload = {
    layoutConfig: buildReportLayoutConfig(context, "OPD Receipt"),
    patientInfo: {
      name: record.patient_full_name,
      uhid: record.patient_uhid,
      phone: record.patient_phone_number,
      visitDate: formatReceiptDateOfIssue(record.created_at),
      visitNumber,
      abhaNo: record.patient_abha_number ?? undefined,
      abhaAddress: record.patient_abha_address ?? undefined,
      address: context?.patientAddress?.trim() || undefined,
    },
    receiptPatient: {
      nameLine,
      phone: record.patient_phone_number,
      email: "—",
      address: context?.patientAddress?.trim() || undefined,
    },
    billNumber: billDetail.bill.bill_number,
    dateOfIssue: formatReceiptDateOfIssue(billDetail.bill.bill_date || billDetail.bill.created_at),
    receiptTitle: "OPD Receipt",
    lineItems,
    billLevelDiscount,
    payment: {
      methods: formatPaymentMethodLabel(context?.paymentMethod),
      amountPaid: receivedAmount,
    },
    grandTotal: summary.finalAmount,
    summary,
    visitNumber,
  };

  return { ok: true, payload };
}
