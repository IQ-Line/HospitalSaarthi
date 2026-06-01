import type { OPDSlipReportPayload } from "@hims/registration-reports";
import type { RegistrationRecord } from "../domain/registration.types.js";
import type { BillingReadPort } from "../ports.js";
import {
  ageYearsFromRegistration,
  buildReportLayoutConfig,
  formatVisitNumberForSlip,
  splitPatientName,
  tokenNumberFromRegistrationId,
  type ReportDocumentContext,
} from "../lib/report-document-context.js";

export interface BuildOpdSlipPayloadDeps {
  billingReadPort: BillingReadPort | undefined;
}

export async function buildOpdSlipPayload(
  deps: BuildOpdSlipPayloadDeps,
  tenantId: string,
  record: RegistrationRecord,
  context?: ReportDocumentContext,
): Promise<OPDSlipReportPayload> {
  const nameParts = splitPatientName(record.patient_full_name);
  const age = ageYearsFromRegistration(record.patient_date_of_birth, record.patient_year_of_birth);
  const departmentName = context?.departmentName?.trim() || "NA";
  const doctorName = context?.doctorName?.trim() || "NA";
  const roomNumber = context?.roomNumber?.trim() || undefined;

  const bills =
    deps.billingReadPort == null
      ? []
      : await deps.billingReadPort.listBillsForRegistration(tenantId, record.registration_id, {
          bearerToken: context?.bearerToken,
          visitId: record.visit_id,
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

  const validTillDate = new Date(record.created_at);
  validTillDate.setDate(validTillDate.getDate() + 7);

  return {
    layoutConfig: buildReportLayoutConfig(context, "OPD Slip"),
    smartParchaPages: [],
    showDoctorSignature: false,
    smartParchaEnabled: true,
    patientData: {
      salutation: "",
      firstName: nameParts.firstName,
      middleName: nameParts.middleName,
      lastName: nameParts.lastName,
      gender: record.patient_gender ?? "",
      age,
      dateOfBirth: record.patient_date_of_birth ?? "",
      phoneNumber: record.patient_phone_number,
      uhid: record.patient_uhid,
      abhaNumber: record.patient_abha_number ?? undefined,
      abhaAddress: record.patient_abha_address ?? undefined,
      addressForDisplay: context?.patientAddress?.trim() || undefined,
    },
    visitData: {
      visitNumber: formatVisitNumberForSlip(record),
      createdAt: record.created_at.toISOString(),
      visitType: record.visit_type ?? "opd_first",
      status: record.registration_status,
      department: { name: departmentName },
      doctor: { name: doctorName },
      roomNumber,
      tokenNumber: tokenNumberFromRegistrationId(record.registration_id),
      fees: feesDisplay,
      visitValidTill: validTillDate.toISOString(),
      abhaNumber: record.patient_abha_number ?? undefined,
      abhaAddress: record.patient_abha_address ?? undefined,
    },
    facilityInfo: {
      name: context?.facilityName,
      address: context?.facilityAddress,
      phone: context?.facilityPhone,
      email: context?.facilityEmail,
      facilityId: context?.facilityId,
    },
    doctorInfo: doctorName !== "NA" ? { name: doctorName } : null,
  };
}
