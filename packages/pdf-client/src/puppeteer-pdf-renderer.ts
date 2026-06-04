import { existsSync } from "node:fs";
import puppeteer, { type Browser, type PDFOptions } from "puppeteer";
import type { PdfRendererPort, PdfRenderOptions, RenderHtmlRequest } from "./types.js";

let browser: Promise<Browser> | undefined;

function toPdfOptions(options: PdfRenderOptions | undefined): PDFOptions {
  return {
    format: options?.format ?? "A4",
    landscape: options?.landscape,
    printBackground: true,
    margin: {
      top: options?.marginTop ?? "0",
      bottom: options?.marginBottom ?? "0",
      left: options?.marginLeft ?? "0",
      right: options?.marginRight ?? "0",
    },
  };
}

function resolveChromePath(): string | undefined {
  for (const candidate of [
    process.env.PUPPETEER_EXECUTABLE_PATH,
    "/usr/bin/google-chrome",
    "/usr/bin/chromium",
    "/usr/bin/chromium-browser",
  ]) {
    const path = candidate?.trim();
    if (path && existsSync(path)) return path;
  }
  try {
    return puppeteer.executablePath();
  } catch {
    return undefined;
  }
}

/** In-process HTML→PDF for local dev; production uses HTTP pdf-platform. */
export class PuppeteerPdfRenderer implements PdfRendererPort {
  async renderHtml({ html, options }: RenderHtmlRequest): Promise<Buffer> {
    browser ??= puppeteer.launch({
      headless: true,
      executablePath: resolveChromePath(),
      args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage"],
    });
    const page = await (await browser).newPage();
    try {
      await page.setContent(html, { waitUntil: "load" });
      return Buffer.from(await page.pdf(toPdfOptions(options)));
    } finally {
      await page.close();
    }
  }
}
