import type { OpdSlipReportRequest, PdfRendererPort } from "@hims/pdf-client";
import { PdfPlatformRenderError } from "@hims/pdf-client";

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
}

export async function renderPartnerOpdSlipPdf(
  deps: RenderPartnerOpdSlipPdfDeps,
  body: OpdSlipReportRequest,
  requestId?: string,
): Promise<PartnerOpdSlipPdfResult> {
  if (!deps.pdfRenderer) {
    return { ok: false, code: "PDF_UNAVAILABLE", message: "PDF renderer not configured" };
  }

  try {
    const data = await deps.pdfRenderer.renderOpdSlipReport({ ...body, requestId });
    return { ok: true, data };
  } catch (err) {
    if (err instanceof PdfPlatformRenderError && err.statusCode === 400) {
      return { ok: false, code: "VALIDATION_ERROR", message: err.responseBody || err.message };
    }
    return { ok: false, code: "PDF_UNAVAILABLE", message: pdfErrorMessage(err) };
  }
}
