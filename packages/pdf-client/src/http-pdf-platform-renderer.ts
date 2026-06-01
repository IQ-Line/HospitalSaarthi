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
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
        Accept: "application/pdf",
      };
      if (request.requestId) {
        headers["x-request-id"] = request.requestId;
      }
      if (this.apiKey) {
        headers.Authorization = `Bearer ${this.apiKey}`;
      }

      const response = await fetch(joinUrl(this.baseUrl, "/v1/pdf/render-html"), {
        method: "POST",
        headers,
        body: JSON.stringify({
          html: request.html,
          headerHtml: request.headerHtml,
          footerHtml: request.footerHtml,
          options: request.options,
        }),
        signal: controller.signal,
      });

      if (!response.ok) {
        const body = await response.text().catch(() => "");
        throw new PdfPlatformRenderError(
          `pdf-platform render failed: ${String(response.status)} ${response.statusText}`,
          response.status,
          body,
        );
      }

      const arrayBuffer = await response.arrayBuffer();
      return Buffer.from(arrayBuffer);
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
