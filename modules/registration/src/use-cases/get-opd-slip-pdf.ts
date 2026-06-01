import type { PdfRendererPort } from "@hims/pdf-client";
import { PdfPlatformRenderError } from "@hims/pdf-client";
import type { RegistrationRepo, BillingReadPort } from "../ports.js";
import { getRegistration } from "./get-registration.js";
import { buildOpdSlipPayload, type BuildOpdSlipPayloadContext } from "./build-opd-slip-payload.js";
import { renderDocumentPdf } from "../lib/documents/render-document-pdf.js";
import { renderOpdSlipHtml } from "../lib/templates/render-opd-slip-html.js";
import { REGISTRATION_STATUS_COMPLETED } from "../lib/registration-helpers.js";

export type GetOpdSlipPdfResult =
  | { ok: true; pdf: Buffer }
  | { ok: false; code: "NOT_FOUND" }
  | { ok: false; code: "NOT_PRINTABLE"; message: string }
  | { ok: false; code: "PDF_UNAVAILABLE"; message: string };

export interface GetOpdSlipPdfDeps {
  registrationRepo: RegistrationRepo;
  billingReadPort: BillingReadPort | undefined;
  pdfRenderer: PdfRendererPort | undefined;
}

export async function getOpdSlipPdf(
  deps: GetOpdSlipPdfDeps,
  tenantId: string,
  registrationId: string,
  context?: BuildOpdSlipPayloadContext & { requestId?: string },
): Promise<GetOpdSlipPdfResult> {
  const record = await getRegistration({ registrationRepo: deps.registrationRepo }, tenantId, registrationId);
  if (!record) {
    return { ok: false, code: "NOT_FOUND" };
  }

  if (record.registration_status !== REGISTRATION_STATUS_COMPLETED) {
    return {
      ok: false,
      code: "NOT_PRINTABLE",
      message: "OPD slip is available after registration is completed",
    };
  }

  if (!deps.pdfRenderer) {
    return {
      ok: false,
      code: "PDF_UNAVAILABLE",
      message: "PDF renderer not configured on this service instance",
    };
  }

  const payload = await buildOpdSlipPayload(
    { billingReadPort: deps.billingReadPort },
    tenantId,
    record,
    context,
  );

  try {
    const pdf = await renderDocumentPdf({
      payload,
      renderHtml: renderOpdSlipHtml,
      pdfRenderer: deps.pdfRenderer,
      requestId: context?.requestId,
    });
    return { ok: true, pdf };
  } catch (err) {
    const message =
      err instanceof PdfPlatformRenderError
        ? err.message
        : err instanceof Error
          ? err.message
          : "PDF render failed";
    return { ok: false, code: "PDF_UNAVAILABLE", message };
  }
}
