import { DEFAULT_REPORT_LOGO_DATA_URL } from "@hims/registration-reports";
import type { ReportDocumentContext } from "./report-document-context.js";

const IMG_SRC_PATTERN = /<img\b[^>]*\ssrc=["']([^"']+)["']/gi;

const dataUrlCache = new Map<string, string>();

function resolveImageUrl(src: string, webOrigin: string | undefined): string {
  const trimmed = src.trim();
  if (
    trimmed.startsWith("data:") ||
    trimmed.startsWith("http://") ||
    trimmed.startsWith("https://")
  ) {
    return trimmed;
  }
  const origin = webOrigin?.trim().replace(/\/$/, "") ?? "";
  if (!origin) return trimmed;
  return trimmed.startsWith("/") ? `${origin}${trimmed}` : `${origin}/${trimmed}`;
}

async function fetchAsDataUrl(
  url: string,
  bearerToken: string | undefined,
): Promise<string | null> {
  if (url.startsWith("data:")) return url;

  const cached = dataUrlCache.get(url);
  if (cached) return cached;

  try {
    const headers: Record<string, string> = {};
    if (bearerToken?.trim()) {
      headers.Authorization = `Bearer ${bearerToken.trim()}`;
    }

    const response = await fetch(url, {
      headers,
      signal: AbortSignal.timeout(10_000),
    });
    if (!response.ok) return null;

    const buffer = Buffer.from(await response.arrayBuffer());
    const contentType = response.headers.get("content-type")?.split(";")[0]?.trim() || "image/png";
    const dataUrl = `data:${contentType};base64,${buffer.toString("base64")}`;
    dataUrlCache.set(url, dataUrl);
    return dataUrl;
  } catch {
    return null;
  }
}

function isLogoSrc(src: string): boolean {
  const lower = src.toLowerCase();
  return lower.includes("reportlogo") || lower.includes("logo");
}

/**
 * Inlines report images as data URLs so Gotenberg can render them without reaching the web app.
 */
export async function inlineReportHtmlImagesForPdf(
  html: string,
  context: ReportDocumentContext | undefined,
  fallbackLogoDataUrl: string = DEFAULT_REPORT_LOGO_DATA_URL,
): Promise<string> {
  const replacements = new Map<string, string>();
  const matches = html.matchAll(IMG_SRC_PATTERN);

  for (const match of matches) {
    const src = match[1];
    if (!src || src.startsWith("data:") || replacements.has(src)) continue;

    const resolved = resolveImageUrl(src, context?.webOrigin);
    let dataUrl = await fetchAsDataUrl(resolved, context?.bearerToken);

    if (!dataUrl && isLogoSrc(src)) {
      dataUrl = fallbackLogoDataUrl;
    }
    if (!dataUrl && isLogoSrc(resolved)) {
      dataUrl = fallbackLogoDataUrl;
    }

    if (dataUrl) {
      replacements.set(src, dataUrl);
    }
  }

  if (replacements.size === 0) return html;

  let result = html;
  for (const [from, to] of replacements) {
    result = result.split(from).join(to);
  }
  return result;
}
