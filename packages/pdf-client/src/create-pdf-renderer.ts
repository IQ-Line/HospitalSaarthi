import { HttpPdfPlatformRenderer } from "./http-pdf-platform-renderer.js";
import { PuppeteerPdfRenderer } from "./puppeteer-pdf-renderer.js";
import type { PdfRendererPort } from "./types.js";

export function createPdfRenderer(config?: {
  mode?: string;
  baseUrl?: string;
  apiKey?: string;
}): PdfRendererPort {
  if (config?.mode === "http") {
    return new HttpPdfPlatformRenderer({
      baseUrl: config.baseUrl ?? "http://localhost:8091",
      apiKey: config.apiKey,
    });
  }
  return new PuppeteerPdfRenderer();
}
