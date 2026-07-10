import { describe, expect, it, vi } from "vitest";
import { buildOpdReceiptReportRequest } from "../../../src/use-cases/build-opd-receipt-report-request.js";
import type { BillingBillDetail, BillingReadPort } from "../../../src/ports.js";
import type { RegistrationRecord } from "../../../src/domain/registration.types.js";
import type { VisitRecord } from "../../../src/domain/visit.types.js";
import type { RegistrationDocumentSource } from "../../../src/lib/registration-document-source.js";
import type { ReportDocumentContext } from "../../../src/lib/report-document-context.js";

const TENANT = "t1";
const REGISTRATION_ID = "11111111-1111-1111-1111-111111110063";
const BILL_ID = "bill-uuid-1";
const VISIT_CREATED = new Date("2026-07-08T09:30:00.000Z");

function makeRegistration(): RegistrationRecord {
  return {
    registration_id: REGISTRATION_ID,
    iq_tenant_id: TENANT,
    patient_id: "patient-1",
    patient_uhid: "UHID-42",
    patient_abha_number: null,
    patient_abha_address: null,
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
  };
}

function makeVisit(): VisitRecord {
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
  };
}

function makeBillDetail(): BillingBillDetail {
  return {
    bill: {
      bill_number: "BILL-001",
      bill_date: "2026-07-08",
      created_at: "2026-07-08T09:35:00.000Z",
      discount_amount: "25",
      paid_amount: "466",
      net_amount: "466",
    },
    items: [
      {
        description: "Consultation",
        quantity: "2",
        unit_price: "250.50",
        discount_amount: "10",
        tax_percentage: "18",
        department: "Cardiology",
        status: "ACTIVE",
      },
      {
        description: "ECG",
        quantity: "1",
        unit_price: "150",
        discount_amount: "0",
        tax_percentage: "12",
        department: null,
        status: "ACTIVE",
      },
      {
        description: "Cancelled X-Ray",
        quantity: "1",
        unit_price: "800",
        discount_amount: "0",
        tax_percentage: "5",
        department: "Radiology",
        status: "VOIDED",
      },
    ],
  };
}

const context: ReportDocumentContext = {
  bearerToken: "tok-abc",
  patientAddress: "1 Winterfell Way",
  facilityName: "Test Hospital",
  paymentMethod: "CASH",
};

const source: RegistrationDocumentSource = { registration: makeRegistration(), visit: makeVisit() };

describe("buildOpdReceiptReportRequest field mapping", () => {
  it("maps ACTIVE bill items onto raw line items and sends NO server-computed summary", async () => {
    const getBill = vi.fn().mockResolvedValue(makeBillDetail());
    const billingReadPort: BillingReadPort = {
      listBillsForRegistration: vi.fn().mockResolvedValue([]),
      getBill,
    };

    const result = await buildOpdReceiptReportRequest({ billingReadPort }, TENANT, source, BILL_ID, context);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const req = result.request;

    // VOIDED item is filtered out; ACTIVE items mapped with RAW numeric values.
    expect(req.lineItems).toEqual([
      {
        serviceName: "Consultation",
        serviceDetail: "Cardiology",
        quantity: 2,
        unitPrice: 250.5,
        gstPercent: 18,
        discount: 10,
      },
      {
        serviceName: "ECG",
        serviceDetail: undefined,
        quantity: 1,
        unitPrice: 150,
        gstPercent: 12,
        discount: 0,
      },
    ]);

    // bill-level values are raw numbers straight off the bill.
    expect(req.billLevelDiscount).toBe(25);
    expect(req.receivedAmount).toBe(466);
    expect(req.paymentMethods).toBe("Cash");
    expect(req.billNumber).toBe("BILL-001");
    expect(req.receiptTitle).toBe("OPD Receipt");

    // CRUCIAL: the request carries no pre-computed totals — the server computes them.
    expect("summary" in req).toBe(false);
    expect("grandTotal" in req).toBe(false);

    // getBill is scoped to tenant + bill, forwarding the bearer token.
    expect(getBill).toHaveBeenCalledWith(TENANT, BILL_ID, { bearerToken: "tok-abc" });
  });

  it("returns BILL_NOT_FOUND when billing has no such bill", async () => {
    const billingReadPort: BillingReadPort = {
      listBillsForRegistration: vi.fn().mockResolvedValue([]),
      getBill: vi.fn().mockResolvedValue(null),
    };

    const result = await buildOpdReceiptReportRequest({ billingReadPort }, TENANT, source, BILL_ID, context);

    expect(result).toEqual({
      ok: false,
      code: "BILL_NOT_FOUND",
      message: "Bill not found for this registration",
    });
  });

  it("returns BILLING_UNAVAILABLE when no billing port is configured", async () => {
    const result = await buildOpdReceiptReportRequest(
      { billingReadPort: undefined },
      TENANT,
      source,
      BILL_ID,
      context,
    );

    expect(result).toEqual({
      ok: false,
      code: "BILLING_UNAVAILABLE",
      message: "Billing service not configured",
    });
  });
});
