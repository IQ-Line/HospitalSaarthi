import type { OpdSlipReportRequest } from "@hims/pdf-client";
import type { BillingReadPort } from "../ports.js";
import {
  buildReportFacility,
  formatVisitNumberForSlip,
  tokenNumberFromRegistrationId,
  type ReportDocumentContext,
} from "../lib/report-document-context.js";
import type { RegistrationDocumentSource } from "../lib/registration-document-source.js";
import { documentVisitRef } from "../lib/registration-document-source.js";

const SLIP_OPTIONS = {
  format: "A4" as const,
  marginTop: "0",
  marginBottom: "0",
  marginLeft: "0",
  marginRight: "0",
};

export interface BuildOpdSlipReportRequestDeps {
  billingReadPort: BillingReadPort | undefined;
}

export async function buildOpdSlipReportRequest(
  deps: BuildOpdSlipReportRequestDeps,
  tenantId: string,
  source: RegistrationDocumentSource,
  context?: ReportDocumentContext,
): Promise<OpdSlipReportRequest> {
  const { registration: record, visit } = source;
  const visitRef = documentVisitRef(source);
  const departmentName = context?.departmentName?.trim() || "NA";
  const doctorName = context?.doctorName?.trim() || "NA";
  const roomNumber = context?.roomNumber?.trim() || undefined;

  const bills =
    deps.billingReadPort == null
      ? []
      : await deps.billingReadPort.listBillsForRegistration(tenantId, record.registration_id, {
          bearerToken: context?.bearerToken,
          visitId: visitRef.id,
        });

  const netTotal = bills.reduce(
    (sum, bill) => sum + Number.parseFloat(bill.netAmount || "0"),
    0,
  );
  const feesDisplay =
    netTotal > 0
      ? new Intl.NumberFormat("en-IN", {
          style: "currency",
          currency: "INR",
          maximumFractionDigits: 2,
        }).format(netTotal)
      : undefined;

  const validTillDate = new Date(visitRef.created_at);
  validTillDate.setDate(validTillDate.getDate() + 7);

  return {
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
      visitType: visit?.visit_type ?? "opd_first",
      status: visit?.status ?? "pending",
      departmentName,
      roomNumber,
      tokenNumber: tokenNumberFromRegistrationId(record.registration_id),
      fees: feesDisplay,
      visitValidTill: validTillDate.toISOString(),
    },
    doctor: { name: doctorName },
    facility: buildReportFacility(context),
    smartParchaEnabled: true,
    smartParchaPages: [],
    showDoctorSignature: false,
    options: SLIP_OPTIONS,
  };
}
