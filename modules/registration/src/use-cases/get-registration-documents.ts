import type { PdfRendererPort } from "@hims/pdf-client";
import { PdfPlatformRenderError } from "@hims/pdf-client";
import type { RegistrationRepo, BillingReadPort, VisitRepo } from "../ports.js";
import { getRegistration } from "./get-registration.js";
import { buildOpdSlipPayload } from "./build-opd-slip-payload.js";
import { buildOpdReceiptPayload } from "./build-opd-receipt-payload.js";
import {
  renderOpdReceiptDocumentHtml,
  renderOpdSlipDocumentHtml,
} from "../lib/registration-reports.js";
import { inlineReportHtmlImagesForPdf } from "../lib/inline-report-html-images.js";
import { isRegistrationDocumentEligible } from "../lib/registration-helpers.js";
import { parseVisitStatus } from "../lib/visit-helpers.js";
import type { ReportDocumentContext } from "../lib/report-document-context.js";
import type { RegistrationDocumentSource } from "../lib/registration-document-source.js";

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

async function renderRegistrationPdf(
  deps: RegistrationDocumentsDeps,
  html: string,
  context: ReportDocumentContext | undefined,
  options: {
    format: "A4";
    marginTop: string;
    marginBottom: string;
    marginLeft: string;
    marginRight: string;
  },
): Promise<DocumentResult<Buffer>> {
  if (!deps.pdfRenderer) {
    return {
      ok: false,
      code: "PDF_UNAVAILABLE",
      message: "PDF renderer not configured on this service instance",
    };
  }

  try {
    const pdfHtml = await inlineReportHtmlImagesForPdf(html, context);
    const pdf = await deps.pdfRenderer.renderHtml({
      html: pdfHtml,
      options,
      requestId: context?.requestId,
    });
    return { ok: true, data: pdf };
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
  const loaded = await loadRegistrationForDocuments(deps, tenantId, registrationId);
  if (!loaded.ok) return loaded;

  const payload = await buildOpdSlipPayload(
    { billingReadPort: deps.billingReadPort },
    tenantId,
    loaded.source,
    context,
  );
  return { ok: true, data: renderOpdSlipDocumentHtml(payload, context) };
}

export async function getOpdReceiptHtml(
  deps: RegistrationDocumentsDeps,
  tenantId: string,
  registrationId: string,
  billId: string,
  context?: ReportDocumentContext,
): Promise<DocumentResult<string>> {
  const loaded = await loadRegistrationForDocuments(deps, tenantId, registrationId);
  if (!loaded.ok) return loaded;

  const built = await buildOpdReceiptPayload(
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

  return { ok: true, data: renderOpdReceiptDocumentHtml(built.payload, context) };
}

export async function getOpdSlipPdf(
  deps: RegistrationDocumentsDeps,
  tenantId: string,
  registrationId: string,
  context?: ReportDocumentContext,
): Promise<DocumentResult<Buffer>> {
  const htmlResult = await getOpdSlipHtml(deps, tenantId, registrationId, context);
  if (!htmlResult.ok) return htmlResult;

  return renderRegistrationPdf(deps, htmlResult.data, context, {
    format: "A4",
    marginTop: "0",
    marginBottom: "0",
    marginLeft: "0",
    marginRight: "0",
  });
}

export async function getOpdReceiptPdf(
  deps: RegistrationDocumentsDeps,
  tenantId: string,
  registrationId: string,
  billId: string,
  context?: ReportDocumentContext,
): Promise<DocumentResult<Buffer>> {
  const htmlResult = await getOpdReceiptHtml(deps, tenantId, registrationId, billId, context);
  if (!htmlResult.ok) return htmlResult;

  return renderRegistrationPdf(deps, htmlResult.data, context, {
    format: "A4",
    marginTop: "0.39in",
    marginBottom: "0.39in",
    marginLeft: "0.39in",
    marginRight: "0.39in",
  });
}
