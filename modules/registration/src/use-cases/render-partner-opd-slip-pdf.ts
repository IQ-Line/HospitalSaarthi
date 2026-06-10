import type { OpdSlipReportRequest, PdfRendererPort } from "@hims/pdf-client";
import { PdfPlatformRenderError } from "@hims/pdf-client";
import { inlineReportHtmlImagesForPdf } from "../lib/inline-report-html-images.js";
import { renderOpdSlipDocumentHtml } from "../lib/registration-reports.js";
import type { ReportDocumentContext } from "../lib/report-document-context.js";
import {
  buildPartnerOpdSlipPayload,
  partnerReportContextFromBody,
} from "./build-partner-opd-slip-payload.js";

export type PartnerOpdSlipPdfResult =
  | { ok: true; data: Buffer }
  | { ok: false; code: "PDF_UNAVAILABLE"; message: string }
  | { ok: false; code: "VALIDATION_ERROR"; message: string };

function pdfErrorMessage(err: unknown): string {
  if (err instanceof PdfPlatformRenderError) return err.message;
  if (err instanceof Error) return err.message;
  return "PDF render failed";
}

export interface RenderPartnerOpdSlipPdfDeps {
  pdfRenderer: PdfRendererPort | undefined;
  defaultReportWebOrigin?: string;
  defaultReportLogoUrl?: string;
}

export async function renderPartnerOpdSlipPdf(
  deps: RenderPartnerOpdSlipPdfDeps,
  body: OpdSlipReportRequest,
  requestId?: string,
): Promise<PartnerOpdSlipPdfResult> {
  if (!deps.pdfRenderer) {
    return { ok: false, code: "PDF_UNAVAILABLE", message: "PDF renderer not configured" };
  }

  const reportContext: ReportDocumentContext = {
    ...partnerReportContextFromBody(body, {
      webOrigin: deps.defaultReportWebOrigin,
      logoUrl: deps.defaultReportLogoUrl,
    }),
    requestId,
  };

  try {
    const payload = buildPartnerOpdSlipPayload(body);
    const html = renderOpdSlipDocumentHtml(payload, reportContext);
    const pdfHtml = await inlineReportHtmlImagesForPdf(html, reportContext);
    const format = body.options?.format ?? "A4";
    const data = await deps.pdfRenderer.renderHtml({
      html: pdfHtml,
      options: {
        format,
        landscape: body.options?.landscape,
        marginTop: body.options?.marginTop ?? "0",
        marginBottom: body.options?.marginBottom ?? "0",
        marginLeft: body.options?.marginLeft ?? "0",
        marginRight: body.options?.marginRight ?? "0",
      },
      requestId,
    });
    return { ok: true, data };
  } catch (err) {
    if (err instanceof PdfPlatformRenderError && err.statusCode === 400) {
      return { ok: false, code: "VALIDATION_ERROR", message: err.responseBody || err.message };
    }
    return { ok: false, code: "PDF_UNAVAILABLE", message: pdfErrorMessage(err) };
  }
}
