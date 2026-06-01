import { describe, expect, it, vi, afterEach } from "vitest";
import { DEFAULT_REPORT_LOGO_DATA_URL } from "@hims/registration-reports";
import { inlineReportHtmlImagesForPdf } from "./inline-report-html-images.js";

describe("inlineReportHtmlImagesForPdf", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("leaves html unchanged when images are already data URLs", async () => {
    const html = `<img src="${DEFAULT_REPORT_LOGO_DATA_URL}" alt="" />`;
    await expect(inlineReportHtmlImagesForPdf(html, undefined)).resolves.toBe(html);
  });

  it("inlines remote logo images for Gotenberg PDF rendering", async () => {
    const logoBytes = Buffer.from("fake-png");
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(logoBytes, {
        status: 200,
        headers: { "content-type": "image/png" },
      }),
    );

    const html = '<img src="/reportLogo.svg" alt="" class="logo-image" />';
    const result = await inlineReportHtmlImagesForPdf(html, {
      webOrigin: "http://localhost:5173",
    });

    expect(result).toContain("data:image/png;base64,");
    expect(result).not.toContain('src="/reportLogo.svg"');
  });

  it("falls back to bundled logo when fetch fails", async () => {
    vi.spyOn(globalThis, "fetch").mockRejectedValue(new Error("network"));

    const html = '<img src="/reportLogo.png" alt="" />';
    const result = await inlineReportHtmlImagesForPdf(html, {
      webOrigin: "http://localhost:5173",
    });

    expect(result).toContain(DEFAULT_REPORT_LOGO_DATA_URL);
  });
});
