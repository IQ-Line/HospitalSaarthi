import type { OpdReceiptReportRequest } from "@hims/pdf-client";
import type { BillingBillDetail, BillingReadPort } from "../ports.js";
import {
  buildReportFacility,
  formatPaymentMethodLabel,
  formatReceiptDateOfIssue,
  formatVisitNumberForSlip,
  type ReportDocumentContext,
} from "../lib/report-document-context.js";
import type { RegistrationDocumentSource } from "../lib/registration-document-source.js";
import { documentVisitRef } from "../lib/registration-document-source.js";

const RECEIPT_OPTIONS = {
  format: "A4" as const,
  marginTop: "0.39in",
  marginBottom: "0.39in",
  marginLeft: "0.39in",
  marginRight: "0.39in",
};

export interface BuildOpdReceiptReportRequestDeps {
  billingReadPort: BillingReadPort | undefined;
}

export type BuildOpdReceiptReportRequestResult =
  | { ok: true; request: OpdReceiptReportRequest }
  | { ok: false; code: "BILL_NOT_FOUND" | "BILLING_UNAVAILABLE"; message: string };

function mapBillToLineItems(bill: BillingBillDetail): OpdReceiptReportRequest["lineItems"] {
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

export async function buildOpdReceiptReportRequest(
  deps: BuildOpdReceiptReportRequestDeps,
  tenantId: string,
  source: RegistrationDocumentSource,
  billId: string,
  context?: ReportDocumentContext,
): Promise<BuildOpdReceiptReportRequestResult> {
  if (!deps.billingReadPort) {
    return { ok: false, code: "BILLING_UNAVAILABLE", message: "Billing service not configured" };
  }

  const { registration: record } = source;
  const visitRef = documentVisitRef(source);

  const billDetail = await deps.billingReadPort.getBill(tenantId, billId, {
    bearerToken: context?.bearerToken,
  });
  if (!billDetail) {
    return { ok: false, code: "BILL_NOT_FOUND", message: "Bill not found for this registration" };
  }

  const lineItems = mapBillToLineItems(billDetail);
  const billLevelDiscount = Number.parseFloat(billDetail.bill.discount_amount) || 0;
  const receivedAmount = Number.parseFloat(billDetail.bill.paid_amount) || 0;

  const request: OpdReceiptReportRequest = {
    patientId: record.patient_id,
    visitId: visitRef.id ?? visitRef.registration_id,
    patient: {
      name: record.patient_full_name,
      uhid: record.patient_uhid,
      phoneNumber: record.patient_phone_number,
      dateOfBirth: record.patient_date_of_birth ?? undefined,
      yearOfBirth: record.patient_year_of_birth ?? undefined,
      gender: record.patient_gender ?? undefined,
      abhaNumber: record.patient_abha_number ?? undefined,
      abhaAddress: record.patient_abha_address ?? undefined,
      address: context?.patientAddress?.trim() || undefined,
    },
    visit: {
      visitNumber: formatVisitNumberForSlip(visitRef),
      createdAt: visitRef.created_at.toISOString(),
    },
    facility: buildReportFacility(context),
    billNumber: billDetail.bill.bill_number,
    dateOfIssue: formatReceiptDateOfIssue(billDetail.bill.bill_date || billDetail.bill.created_at),
    receiptTitle: "OPD Receipt",
    lineItems,
    billLevelDiscount,
    receivedAmount,
    paymentMethods: formatPaymentMethodLabel(context?.paymentMethod),
    options: RECEIPT_OPTIONS,
  };

  return { ok: true, request };
}
