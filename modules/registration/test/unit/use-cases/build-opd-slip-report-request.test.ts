import { describe, expect, it, vi } from "vitest";
import { buildOpdSlipReportRequest } from "../../../src/use-cases/build-opd-slip-report-request.js";
import type { BillingReadPort } from "../../../src/ports.js";
import type { RegistrationRecord } from "../../../src/domain/registration.types.js";
import type { VisitRecord } from "../../../src/domain/visit.types.js";
import type { RegistrationDocumentSource } from "../../../src/lib/registration-document-source.js";
import type { ReportDocumentContext } from "../../../src/lib/report-document-context.js";

const TENANT = "t1";

// registration_id chosen so tokenNumberFromRegistrationId is deterministic:
// last 4 hex chars "0063" → parseInt(…,16)=99 → (99 % 10000)+1 = 100.
const REGISTRATION_ID = "11111111-1111-1111-1111-111111110063";
const EXPECTED_TOKEN = 100;

const VISIT_CREATED = new Date("2026-07-08T09:30:00.000Z");

function makeRegistration(over: Partial<RegistrationRecord> = {}): RegistrationRecord {
  return {
    registration_id: REGISTRATION_ID,
    iq_tenant_id: TENANT,
    patient_id: "patient-1",
    patient_uhid: "UHID-42",
    patient_abha_number: "12-3456-7890-1234",
    patient_abha_address: "arya@abdm",
    patient_full_name: "Arya Stark",
    patient_phone_number: "9876543210",
    patient_gender: "female",
    patient_date_of_birth: "1998-04-12",
    patient_year_of_birth: 1998,
    patient_source_record_id: "src-1",
    idempotency_key: "idem-1",
    created_by: null,
    updated_by: null,
    created_at: new Date("2026-07-01T00:00:00.000Z"),
    updated_at: new Date("2026-07-01T00:00:00.000Z"),
    ...over,
  };
}

function makeVisit(over: Partial<VisitRecord> = {}): VisitRecord {
  return {
    id: "visit-uuid-1",
    visit_id: "OP-1",
    iq_tenant_id: TENANT,
    patient_id: "patient-1",
    visit_type: "opd_first",
    consultation_type: "new",
    is_free_follow_up: false,
    free_follow_up_visit_count: 0,
    free_follow_up_valid_till: null,
    free_follow_up_details: null,
    parent_visit_id: null,
    status: "pending",
    facility_id: null,
    department_id: "dept-1",
    doctor_id: "doc-1",
    appointment_id: null,
    idempotency_key: "idem-1",
    created_by: null,
    updated_by: null,
    created_at: VISIT_CREATED,
    updated_at: VISIT_CREATED,
    ...over,
  };
}

const context: ReportDocumentContext = {
  bearerToken: "tok-abc",
  departmentName: "Cardiology",
  doctorName: "Dr. Strange",
  roomNumber: "R-12",
  patientAddress: "1 Winterfell Way",
  facilityName: "Test Hospital",
  facilityAddress: "Kings Landing",
  paymentMethod: "CASH",
};

describe("buildOpdSlipReportRequest field mapping", () => {
  it("maps the registration record + visit + context onto the typed slip request", async () => {
    const source: RegistrationDocumentSource = { registration: makeRegistration(), visit: makeVisit() };
    const listBillsForRegistration = vi
      .fn()
      .mockResolvedValue([{ billId: "b1", billNumber: "BILL-001", netAmount: "500.00", status: "FINALIZED" }]);
    const billingReadPort: BillingReadPort = {
      listBillsForRegistration,
      getBill: vi.fn().mockResolvedValue(null),
    };

    const req = await buildOpdSlipReportRequest({ billingReadPort }, TENANT, source, context);

    // patient block ← record.*
    expect(req.patient.name).toBe("Arya Stark");
    expect(req.patient.uhid).toBe("UHID-42");
    expect(req.patient.phoneNumber).toBe("9876543210");
    expect(req.patient.dateOfBirth).toBe("1998-04-12");
    expect(req.patient.yearOfBirth).toBe(1998);
    expect(req.patient.gender).toBe("female");
    expect(req.patient.abhaNumber).toBe("12-3456-7890-1234");
    expect(req.patient.abhaAddress).toBe("arya@abdm");
    expect(req.patient.address).toBe("1 Winterfell Way");

    // visit block
    expect(req.visit.createdAt).toBe(VISIT_CREATED.toISOString());
    expect(req.visit.visitNumber).toBe("OP-1");
    expect(req.visit.tokenNumber).toBe(EXPECTED_TOKEN);
    expect(req.visit.departmentName).toBe("Cardiology");
    expect(req.visit.roomNumber).toBe("R-12");

    // doctor / facility from context
    expect(req.doctor.name).toBe("Dr. Strange");
    expect(req.facility.name).toBe("Test Hospital");

    // options margins are all "0" (full-bleed A4)
    expect(req.options).toMatchObject({
      format: "A4",
      marginTop: "0",
      marginBottom: "0",
      marginLeft: "0",
      marginRight: "0",
    });

    expect(req.smartParchaEnabled).toBe(true);

    // fees are formatted from the billing net total when bills exist
    expect(req.visit.fees).toContain("500.00");

    // billing read is scoped to tenant + registration + visit, forwarding the bearer token
    expect(listBillsForRegistration).toHaveBeenCalledWith(TENANT, REGISTRATION_ID, {
      bearerToken: "tok-abc",
      visitId: "visit-uuid-1",
    });
  });

  it("omits fees when no billing port is configured (no-billing branch)", async () => {
    const source: RegistrationDocumentSource = { registration: makeRegistration(), visit: makeVisit() };

    const req = await buildOpdSlipReportRequest({ billingReadPort: undefined }, TENANT, source, context);

    expect(req.visit.fees).toBeUndefined();
    // core mapping still holds without billing
    expect(req.patient.name).toBe("Arya Stark");
    expect(req.visit.tokenNumber).toBe(EXPECTED_TOKEN);
    expect(req.smartParchaEnabled).toBe(true);
  });
});
