import type { OpdSlipReportRequest, PdfRendererPort } from "@hims/pdf-client";
import { describe, expect, it, vi } from "vitest";
import { buildPartnerOpdSlipPayload } from "./build-partner-opd-slip-payload.js";
import { renderPartnerOpdSlipPdf } from "./render-partner-opd-slip-pdf.js";

const sampleBody: OpdSlipReportRequest = {
  patientId: "pat-001",
  visitId: "vis-abc12345-6789",
  doctorId: "doc-001",
  patient: {
    name: "Raj Kumar Sharma",
    uhid: "UHID-2024-0001",
    phoneNumber: "9876543210",
    dateOfBirth: "1990-05-15",
    gender: "male",
  },
  visit: {
    createdAt: "2026-06-03T10:30:00.000Z",
    visitType: "opd_first",
    status: "pending",
    departmentName: "General Medicine",
    tokenNumber: 42,
    fees: "₹500.00",
  },
  doctor: {
    name: "Dr. Ananya Patel",
    specialization: "General Medicine",
    regNumber: "MCI-12345",
  },
  facility: {
    name: "City Care Hospital",
    address: "Sector 12, Noida",
    phone: "+91-120-0000000",
    email: "info@citycare.example",
    facilityId: "FAC-001",
  },
  smartParchaEnabled: true,
  options: { format: "A4" },
};

describe("buildPartnerOpdSlipPayload", () => {
  it("maps partner fields into OPD slip report payload", () => {
    const payload = buildPartnerOpdSlipPayload(sampleBody);
    expect(payload.patientData.uhid).toBe("UHID-2024-0001");
    expect(payload.visitData.tokenNumber).toBe(42);
    expect(payload.facilityInfo.name).toBe("City Care Hospital");
    expect(payload.doctorInfo?.name).toBe("Dr. Ananya Patel");
  });
});

describe("renderPartnerOpdSlipPdf", () => {
  it("renders HTML locally and calls pdf-platform render-html", async () => {
    const renderHtml = vi.fn(async () => Buffer.from("%PDF-1.4"));
    const pdfRenderer: PdfRendererPort = {
      renderHtml,
      renderOpdSlipReport: vi.fn(),
    };

    const result = await renderPartnerOpdSlipPdf(
      { pdfRenderer, defaultReportWebOrigin: "http://localhost:5173" },
      sampleBody,
      "req-1",
    );

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.toString()).toContain("%PDF");
    }
    expect(renderHtml).toHaveBeenCalledOnce();
    const call = renderHtml.mock.calls[0]![0];
    expect(call.html).toContain("Raj Kumar Sharma");
    expect(call.options?.format).toBe("A4");
    expect(call.requestId).toBe("req-1");
  });
});
