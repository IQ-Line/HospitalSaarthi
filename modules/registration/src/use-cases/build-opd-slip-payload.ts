import type { OpdSlipDocumentPayload } from "../domain/opd-slip.types.js";
import type { RegistrationRecord } from "../domain/registration.types.js";
import type { BillingReadPort } from "../ports.js";
import {
  formatAgeGender,
  formatInr,
  formatTokenDisplay,
  formatVisitDateTime,
  formatVisitNumber,
  formatVisitTypeLabel,
} from "../lib/opd-slip-formatters.js";

export interface BuildOpdSlipPayloadDeps {
  billingReadPort: BillingReadPort | undefined;
}

export interface BuildOpdSlipPayloadContext {
  bearerToken?: string;
  facilityName?: string;
  facilityMeta?: string;
}

export async function buildOpdSlipPayload(
  deps: BuildOpdSlipPayloadDeps,
  tenantId: string,
  record: RegistrationRecord,
  context?: BuildOpdSlipPayloadContext,
): Promise<OpdSlipDocumentPayload> {
  const bills =
    deps.billingReadPort == null
      ? []
      : await deps.billingReadPort.listBillsForRegistration(tenantId, record.registration_id, {
          bearerToken: context?.bearerToken,
          visitId: record.visit_id,
        });

  const billingLines = bills.map((bill) => ({
    description: `Bill ${bill.billNumber} (${bill.status})`,
    amount: formatInr(bill.netAmount),
  }));

  const billingTotal =
    bills.length > 0
      ? formatInr(
          bills.reduce((sum, bill) => sum + Number.parseFloat(bill.netAmount || "0"), 0),
        )
      : null;

  const abhaParts = [record.patient_abha_number, record.patient_abha_address].filter(Boolean);
  const abhaDisplay = abhaParts.length > 0 ? abhaParts.join(" / ") : "—";

  return {
    facilityName: context?.facilityName?.trim() || "Hospital",
    facilityMeta: context?.facilityMeta?.trim() || "OPD Registration",
    tokenDisplay: formatTokenDisplay(record),
    patientName: record.patient_full_name,
    uhid: record.patient_uhid,
    ageGender: formatAgeGender(
      record.patient_gender,
      record.patient_date_of_birth,
      record.patient_year_of_birth,
    ),
    phone: record.patient_phone_number,
    abhaDisplay,
    visitNumber: formatVisitNumber(record),
    visitDateTime: formatVisitDateTime(record.created_at),
    visitTypeLabel: formatVisitTypeLabel(record.visit_type),
    departmentName: "—",
    doctorName: "—",
    roomDisplay: "—",
    validTillDisplay: "—",
    opdDaysDisplay: "—",
    billingLines,
    billingTotal,
    instructions: "Please report to the waiting area with this slip.",
  };
}
