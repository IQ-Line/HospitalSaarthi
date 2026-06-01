import type { PdfRendererPort, PdfRenderOptions } from "@hims/pdf-client";

export interface RenderDocumentPdfParams<TPayload> {
  payload: TPayload;
  renderHtml: (payload: TPayload) => string;
  pdfRenderer: PdfRendererPort;
  options?: PdfRenderOptions;
  requestId?: string;
}

export async function renderDocumentPdf<TPayload>(
  params: RenderDocumentPdfParams<TPayload>,
): Promise<Buffer> {
  const html = params.renderHtml(params.payload);
  return params.pdfRenderer.renderHtml({
    html,
    options: params.options ?? {
      format: "A4",
      marginTop: "0.39in",
      marginBottom: "0.39in",
      marginLeft: "0.39in",
      marginRight: "0.39in",
    },
    requestId: params.requestId,
  });
}
