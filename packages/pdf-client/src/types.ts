export type PdfPageFormat = "A4" | "Letter";

export interface PdfRenderOptions {
  landscape?: boolean;
  format?: PdfPageFormat;
  marginTop?: string;
  marginBottom?: string;
  marginLeft?: string;
  marginRight?: string;
}

export interface RenderHtmlRequest {
  html: string;
  headerHtml?: string;
  footerHtml?: string;
  options?: PdfRenderOptions;
  /** Propagated as `x-request-id` to pdf-platform. */
  requestId?: string;
}

export interface PdfRendererPort {
  renderHtml(request: RenderHtmlRequest): Promise<Buffer>;
  renderReport(slug: string, body: Record<string, unknown>, requestId?: string): Promise<Buffer>;
  renderReportHtml(slug: string, body: Record<string, unknown>, requestId?: string): Promise<string>;
}

export interface HttpPdfPlatformRendererConfig {
  baseUrl: string;
  apiKey?: string;
  timeoutMs?: number;
}
