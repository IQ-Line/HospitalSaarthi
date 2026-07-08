import type {
  HttpPdfPlatformRendererConfig,
  PdfRendererPort,
  RenderHtmlRequest,
} from "./types.js";

const DEFAULT_TIMEOUT_MS = 125_000;

function joinUrl(base: string, path: string): string {
  const b = base.replace(/\/$/, "");
  const p = path.startsWith("/") ? path : `/${path}`;
  return `${b}${p}`;
}

export class HttpPdfPlatformRenderer implements PdfRendererPort {
  private readonly baseUrl: string;
  private readonly apiKey: string | undefined;
  private readonly timeoutMs: number;

  constructor(config: HttpPdfPlatformRendererConfig) {
    this.baseUrl = config.baseUrl.replace(/\/$/, "");
    this.apiKey = config.apiKey?.trim() || undefined;
    this.timeoutMs = config.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  }

  async renderHtml(request: RenderHtmlRequest): Promise<Buffer> {
    return this.postPdf("/v1/pdf/render-html", {
      html: request.html,
      headerHtml: request.headerHtml,
      footerHtml: request.footerHtml,
      options: request.options,
    }, request.requestId);
  }

  async renderReport(
    slug: string,
    body: Record<string, unknown>,
    requestId?: string,
  ): Promise<Buffer> {
    return this.postPdf(`/v1/pdf/reports/${slug}`, body, requestId);
  }

  async renderReportHtml(
    slug: string,
    body: Record<string, unknown>,
    requestId?: string,
  ): Promise<string> {
    const response = await this.post(`/v1/pdf/reports/${slug}/html`, "text/html", body, requestId);
    return response.text();
  }

  private async postPdf(
    path: string,
    body: Record<string, unknown>,
    requestId?: string,
  ): Promise<Buffer> {
    const response = await this.post(path, "application/pdf", body, requestId);
    const arrayBuffer = await response.arrayBuffer();
    return Buffer.from(arrayBuffer);
  }

  private async post(
    path: string,
    accept: string,
    body: Record<string, unknown>,
    requestId?: string,
  ): Promise<Response> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
        Accept: accept,
      };
      if (requestId) {
        headers["x-request-id"] = requestId;
      }
      if (this.apiKey) {
        headers.Authorization = `Bearer ${this.apiKey}`;
      }

      const response = await fetch(joinUrl(this.baseUrl, path), {
        method: "POST",
        headers,
        body: JSON.stringify(body),
        signal: controller.signal,
      });

      if (!response.ok) {
        const responseBody = await response.text().catch(() => "");
        throw new PdfPlatformRenderError(
          `pdf-platform render failed: ${String(response.status)} ${response.statusText}`,
          response.status,
          responseBody,
        );
      }

      return response;
    } finally {
      clearTimeout(timeout);
    }
  }
}

export class PdfPlatformRenderError extends Error {
  constructor(
    message: string,
    readonly statusCode: number,
    readonly responseBody: string,
  ) {
    super(message);
    this.name = "PdfPlatformRenderError";
  }
}
