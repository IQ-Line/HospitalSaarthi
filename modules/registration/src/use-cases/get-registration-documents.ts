import type { PdfRendererPort } from "@hims/pdf-client";
import { PdfPlatformRenderError } from "@hims/pdf-client";
import type { RegistrationRepo, BillingReadPort, VisitRepo } from "../ports.js";
import { getRegistration } from "./get-registration.js";
import { buildOpdSlipReportRequest } from "./build-opd-slip-report-request.js";
import { buildOpdReceiptReportRequest } from "./build-opd-receipt-report-request.js";
import { isRegistrationDocumentEligible } from "../lib/registration-helpers.js";
import { parseVisitStatus } from "../lib/visit-helpers.js";
import type { ReportDocumentContext } from "../lib/report-document-context.js";
import type { RegistrationDocumentSource } from "../lib/registration-document-source.js";

const OPD_SLIP_SLUG = "opd-slip";
const OPD_RECEIPT_SLUG = "opd-receipt";

function pdfErrorMessage(err: unknown): string {
  if (err instanceof PdfPlatformRenderError) return err.message;
  if (err instanceof Error) return err.message;
  return "PDF render failed";
}

export type DocumentResult<T> =
  | { ok: true; data: T }
  | { ok: false; code: "NOT_FOUND" }
  | { ok: false; code: "NOT_PRINTABLE"; message: string }
  | { ok: false; code: "BILL_NOT_FOUND"; message: string }
  | { ok: false; code: "PDF_UNAVAILABLE"; message: string };

export interface RegistrationDocumentsDeps {
  registrationRepo: RegistrationRepo;
  visitRepo: VisitRepo;
  billingReadPort: BillingReadPort | undefined;
  pdfRenderer: PdfRendererPort | undefined;
}

async function loadRegistrationForDocuments(
  deps: RegistrationDocumentsDeps,
  tenantId: string,
  registrationId: string,
): Promise<
  | { ok: true; source: RegistrationDocumentSource }
  | { ok: false; code: "NOT_FOUND" }
  | { ok: false; code: "NOT_PRINTABLE"; message: string }
> {
  const record = await getRegistration({ registrationRepo: deps.registrationRepo }, tenantId, registrationId);
  if (!record) {
    return { ok: false, code: "NOT_FOUND" };
  }

  const visit =
    (await deps.visitRepo.findLatestByPatientId(tenantId, record.patient_id)) ?? null;

  if (visit) {
    let status;
    try {
      status = parseVisitStatus(visit.status);
    } catch {
      return {
        ok: false,
        code: "NOT_PRINTABLE",
        message: "Visit status is invalid for document generation",
      };
    }

    if (!isRegistrationDocumentEligible(status)) {
      return {
        ok: false,
        code: "NOT_PRINTABLE",
        message: "Documents are not available for cancelled visits",
      };
    }
  }

  return { ok: true, source: { registration: record, visit } };
}

async function buildSlipRequest(
  deps: RegistrationDocumentsDeps,
  tenantId: string,
  registrationId: string,
  context: ReportDocumentContext | undefined,
): Promise<
  | { ok: true; request: Record<string, unknown> }
  | { ok: false; code: "NOT_FOUND" }
  | { ok: false; code: "NOT_PRINTABLE"; message: string }
> {
  const loaded = await loadRegistrationForDocuments(deps, tenantId, registrationId);
  if (!loaded.ok) return loaded;

  const request = await buildOpdSlipReportRequest(
    { billingReadPort: deps.billingReadPort },
    tenantId,
    loaded.source,
    context,
  );
  return { ok: true, request: request as unknown as Record<string, unknown> };
}

async function buildReceiptRequest(
  deps: RegistrationDocumentsDeps,
  tenantId: string,
  registrationId: string,
  billId: string,
  context: ReportDocumentContext | undefined,
): Promise<
  | { ok: true; request: Record<string, unknown> }
  | { ok: false; code: "NOT_FOUND" }
  | { ok: false; code: "NOT_PRINTABLE"; message: string }
  | { ok: false; code: "BILL_NOT_FOUND"; message: string }
> {
  const loaded = await loadRegistrationForDocuments(deps, tenantId, registrationId);
  if (!loaded.ok) return loaded;

  const built = await buildOpdReceiptReportRequest(
    { billingReadPort: deps.billingReadPort },
    tenantId,
    loaded.source,
    billId,
    context,
  );
  if (!built.ok) {
    if (built.code === "BILL_NOT_FOUND") {
      return { ok: false, code: "BILL_NOT_FOUND", message: built.message };
    }
    return { ok: false, code: "NOT_PRINTABLE", message: built.message };
  }

  return { ok: true, request: built.request as unknown as Record<string, unknown> };
}

async function renderReportPdf(
  deps: RegistrationDocumentsDeps,
  slug: string,
  request: Record<string, unknown>,
  requestId: string | undefined,
): Promise<DocumentResult<Buffer>> {
  if (!deps.pdfRenderer) {
    return {
      ok: false,
      code: "PDF_UNAVAILABLE",
      message: "PDF renderer not configured on this service instance",
    };
  }
  try {
    const pdf = await deps.pdfRenderer.renderReport(slug, request, requestId);
    return { ok: true, data: pdf };
  } catch (err) {
    return { ok: false, code: "PDF_UNAVAILABLE", message: pdfErrorMessage(err) };
  }
}

async function renderReportHtml(
  deps: RegistrationDocumentsDeps,
  slug: string,
  request: Record<string, unknown>,
  requestId: string | undefined,
): Promise<DocumentResult<string>> {
  if (!deps.pdfRenderer) {
    return {
      ok: false,
      code: "PDF_UNAVAILABLE",
      message: "PDF renderer not configured on this service instance",
    };
  }
  try {
    const html = await deps.pdfRenderer.renderReportHtml(slug, request, requestId);
    return { ok: true, data: html };
  } catch (err) {
    return { ok: false, code: "PDF_UNAVAILABLE", message: pdfErrorMessage(err) };
  }
}

export async function getOpdSlipHtml(
  deps: RegistrationDocumentsDeps,
  tenantId: string,
  registrationId: string,
  context?: ReportDocumentContext,
): Promise<DocumentResult<string>> {
  const built = await buildSlipRequest(deps, tenantId, registrationId, context);
  if (!built.ok) return built;
  return renderReportHtml(deps, OPD_SLIP_SLUG, built.request, context?.requestId);
}

export async function getOpdSlipPdf(
  deps: RegistrationDocumentsDeps,
  tenantId: string,
  registrationId: string,
  context?: ReportDocumentContext,
): Promise<DocumentResult<Buffer>> {
  const built = await buildSlipRequest(deps, tenantId, registrationId, context);
  if (!built.ok) return built;
  return renderReportPdf(deps, OPD_SLIP_SLUG, built.request, context?.requestId);
}

export async function getOpdReceiptHtml(
  deps: RegistrationDocumentsDeps,
  tenantId: string,
  registrationId: string,
  billId: string,
  context?: ReportDocumentContext,
): Promise<DocumentResult<string>> {
  const built = await buildReceiptRequest(deps, tenantId, registrationId, billId, context);
  if (!built.ok) return built;
  return renderReportHtml(deps, OPD_RECEIPT_SLUG, built.request, context?.requestId);
}

export async function getOpdReceiptPdf(
  deps: RegistrationDocumentsDeps,
  tenantId: string,
  registrationId: string,
  billId: string,
  context?: ReportDocumentContext,
): Promise<DocumentResult<Buffer>> {
  const built = await buildReceiptRequest(deps, tenantId, registrationId, billId, context);
  if (!built.ok) return built;
  return renderReportPdf(deps, OPD_RECEIPT_SLUG, built.request, context?.requestId);
}
