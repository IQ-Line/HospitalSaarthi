/**
 * Client-side clinical report print — same pipeline as hims printUtils.generateOPConsultationPdfBlobFromHtml.
 * Captures header/footer separately and composites them on every A4 page before opening the print dialog.
 */

const A4_WIDTH_PX = 794;
const PDF_DOM_CAPTURE_SCALE = 3;
const DEFAULT_REPORT_CONTENT_HPAD_MM = 20;

const FORCE_REPORT_WIDTH_CSS = `
html, body { min-width: ${A4_WIDTH_PX}px !important; margin: 0 !important; padding: 0 !important; box-sizing: border-box !important; }
.report-print-root {
  width: ${A4_WIDTH_PX}px !important;
  max-width: ${A4_WIDTH_PX}px !important;
  min-width: ${A4_WIDTH_PX}px !important;
  margin: 0 auto !important;
  box-sizing: border-box !important;
}
.report-content {
  padding-left: 20mm !important;
  padding-right: 20mm !important;
  box-sizing: border-box !important;
}
`;

const FORCE_TABLE_ALIGN_CSS = `.report-print-root table.report-table th,
.report-print-root table.report-table td,
.report-print-root table.report-table thead th,
.report-print-root table.report-table tbody td { text-align: center !important; vertical-align: middle !important; }
.report-print-root .report-signatory { width: 60px !important; min-height: 24px !important; max-width: 60px !important; font-size: 4px !important; }
.report-print-root .report-signatory .report-signature-img { max-height: 14px !important; }
.report-print-root .report-signatory .report-signatory-name { font-size: 5px !important; }
.report-print-root .report-signatory .report-signatory-details { font-size: 4px !important; }`;

const SIGNATORY_HIGH_RES_CSS = (signatoryCaptureWidthPx: number) => `
.report-print-root .report-signatory { width: ${signatoryCaptureWidthPx}px !important; min-height: 96px !important; max-width: ${signatoryCaptureWidthPx}px !important; font-size: 16px !important; }
.report-print-root .report-signatory .report-signature-img { max-height: 56px !important; }
.report-print-root .report-signatory .report-signatory-name { font-size: 18px !important; }
.report-print-root .report-signatory .report-signatory-details { font-size: 14px !important; }
`;

const CONTENT_NO_MARGIN_CSS = `
.report-print-root .report-content { margin: 0 !important; padding-top: 0 !important; padding-left: 20mm !important; padding-right: 20mm !important; padding-bottom: 0 !important; box-sizing: border-box !important; width: 100% !important; max-width: 100% !important; }
.report-print-root .report-content .content-wrapper,
.report-print-root .report-content .content-section,
.report-print-root .report-content .patient-info-container { width: 100% !important; max-width: none !important; box-sizing: border-box !important; }
.report-print-root .report-content table.report-table { width: 100% !important; max-width: none !important; }
.report-print-root .report-content .patient-info-container,
.report-print-root .report-content .content-section { line-height: 1.2 !important; }
.report-print-root .report-content .patient-info-container { margin-top: 10px !important; margin-bottom: 14px !important; }
.report-print-root .text { line-height: 1 !important; }
.report-footer .report-page-number::after { content: none !important; }
.report-footer .report-page-number { min-height: 0; overflow: hidden; }
.report-print-root .report-content .report-header { visibility: hidden !important; height: 0 !important; min-height: 0 !important; overflow: hidden !important; margin: 0 !important; padding: 0 !important; border: none !important; }
`;

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}

async function inlineReportLogoForPdfCapture(root: Document | Element): Promise<void> {
  try {
    const res = await fetch('/reportLogo.svg');
    if (!res.ok) return;
    const dataUrl = await blobToDataUrl(await res.blob());
    const imgs = root.querySelectorAll<HTMLImageElement>(
      '.report-logo img, header.report-header img.logo-image, .report-header img.logo-image',
    );
    await Promise.all(
      Array.from(imgs).map(async (img) => {
        img.src = dataUrl;
        try {
          if (img.decode) await img.decode();
          else await new Promise<void>((r) => (img.onload = () => r()));
        } catch {
          /* ignore */
        }
      }),
    );
  } catch {
    /* ignore */
  }
}

async function replaceExternalReportImagesWithDataUrls(iframeDoc: Document): Promise<void> {
  const base = iframeDoc.defaultView?.location?.origin ?? window.location.origin;
  const imgs = iframeDoc.querySelectorAll<HTMLImageElement>('img[src]');
  await Promise.all(
    Array.from(imgs).map(async (img) => {
      let url = (img.getAttribute('src') || img.src || '').trim();
      if (!url || url.startsWith('data:')) return;
      if (url.startsWith('//')) url = `https:${url}`;
      else if (url.startsWith('/')) url = `${base}${url}`;
      try {
        const sameOrigin = new URL(url).origin === window.location.origin;
        const res = await fetch(url, {
          mode: 'cors',
          credentials: sameOrigin ? 'include' : 'omit',
        });
        if (!res.ok) return;
        img.src = await blobToDataUrl(await res.blob());
        if (img.decode) await img.decode();
        else {
          await new Promise<void>((resolve) => {
            img.onload = () => resolve();
            img.onerror = () => resolve();
            window.setTimeout(() => resolve(), 2200);
          });
        }
      } catch {
        /* CORS or network */
      }
    }),
  );
}

async function waitForSingleReportImage(img: HTMLImageElement): Promise<void> {
  const isSignature = img.classList.contains('report-signature-img');
  const timeoutMs = isSignature ? 15_000 : 9000;

  if (!img.complete) {
    await new Promise<void>((resolve) => {
      const timer = window.setTimeout(resolve, timeoutMs);
      const finish = () => {
        window.clearTimeout(timer);
        resolve();
      };
      img.addEventListener('load', finish, { once: true });
      img.addEventListener('error', finish, { once: true });
    });
  }

  try {
    if (img.decode) await img.decode();
  } catch {
    /* broken image */
  }
}

async function waitForReportImagesReady(root: Document | Element): Promise<void> {
  const imgs = root.querySelectorAll<HTMLImageElement>('img');
  await Promise.all(Array.from(imgs).map((img) => waitForSingleReportImage(img)));
  await new Promise<void>((resolve) => {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => resolve());
    });
  });
}

export function printClinicalReportPdfBlob(blob: Blob): void {
  const url = URL.createObjectURL(blob);
  const printWindow = window.open(url, '_blank');
  if (!printWindow) {
    URL.revokeObjectURL(url);
    throw new Error('Could not open print window');
  }
  const revoke = () => {
    try {
      URL.revokeObjectURL(url);
    } catch {
      /* ignore */
    }
  };
  printWindow.addEventListener('load', () => {
    try {
      printWindow.print();
    } catch {
      /* ignore */
    }
    revoke();
  });
  window.setTimeout(() => {
    try {
      printWindow.print();
    } catch {
      /* ignore */
    }
    revoke();
  }, 2500);
}

const SIGNATORY_CAPTURE_WIDTH_PX = 240;
const PAGE_WIDTH_MM = 210;
const PAGE_HEIGHT_MM = 297;

const PAGE_NUMBER_FOOTER_CSS =
  '.report-footer .report-page-number::after { content: none !important; }.report-footer .report-page-number { min-height: 0; overflow: hidden; }';

type CaptureOpts = { scale: number; backgroundColor: string; timeout: number };
type DomToCanvas = (el: HTMLElement, opts: Record<string, unknown>) => Promise<HTMLCanvasElement>;
type Region = { sourceY: number; sourceH: number; destY: number };
type ScaledBlock = { sourceY: number; sourceH: number };

/** Create the off-screen iframe used to render the report HTML for capture. */
function createCaptureIframe(htmlContent: string): { iframe: HTMLIFrameElement; iframeDoc: Document } {
  const iframe = document.createElement('iframe');
  iframe.setAttribute('data-pdf-capture', 'true');
  iframe.style.cssText = 'position:fixed;left:-10000px;top:0;width:794px;height:auto;border:none;';
  document.body.appendChild(iframe);

  const iframeDoc = iframe.contentDocument;
  if (!iframeDoc) {
    document.body.removeChild(iframe);
    throw new Error('Could not access iframe document');
  }

  iframeDoc.open();
  iframeDoc.write(htmlContent);
  iframeDoc.close();

  return { iframe, iframeDoc };
}

function makeStyleInjector(iframeDoc: Document): (css: string) => HTMLStyleElement {
  return (css: string) => {
    const style = iframeDoc.createElement('style');
    style.setAttribute('data-pdf-capture', 'true');
    style.textContent = css;
    iframeDoc.head.appendChild(style);
    return style;
  };
}

function waitForIframeLoad(iframe: HTMLIFrameElement, iframeDoc: Document): Promise<void> {
  return new Promise<void>((resolve) => {
    if (iframe.contentWindow) {
      iframe.contentWindow.addEventListener('load', () => resolve(), { once: true });
      if (iframeDoc.readyState === 'complete') window.setTimeout(resolve, 0);
    } else {
      window.setTimeout(resolve, 300);
    }
  });
}

function hasRenderableSignatory(signatoryEl: HTMLElement | null): signatoryEl is HTMLElement {
  return (
    !!signatoryEl &&
    signatoryEl.children.length > 0 &&
    (!!signatoryEl.textContent?.trim() || !!signatoryEl.querySelector('img'))
  );
}

/** Capture header/footer/signatory as separate canvases (each may be null). */
async function captureChromeCanvases(
  domToCanvas: DomToCanvas,
  captureOpts: CaptureOpts,
  els: {
    captureEl: HTMLElement | null;
    headerEl: HTMLElement | null;
    footerEl: HTMLElement | null;
    signatoryEl: HTMLElement | null;
    hasSignatoryContent: boolean;
  },
): Promise<[HTMLCanvasElement | null, HTMLCanvasElement | null, HTMLCanvasElement | null]> {
  const { captureEl, headerEl, footerEl, signatoryEl, hasSignatoryContent } = els;
  const contentWidthForHeader = captureEl
    ? Math.max(captureEl.scrollWidth || 0, captureEl.offsetWidth || 0, A4_WIDTH_PX)
    : A4_WIDTH_PX;
  const headerW = Math.max(headerEl?.offsetWidth ?? 0, contentWidthForHeader);
  const headerH = Math.max(headerEl?.offsetHeight ?? 0, 90);
  const footerW = Math.max(footerEl?.offsetWidth ?? 0, contentWidthForHeader);
  const footerH = Math.max(footerEl?.offsetHeight ?? 0, 60);
  const signatoryW = Math.max(signatoryEl?.offsetWidth ?? 0, SIGNATORY_CAPTURE_WIDTH_PX);
  const signatoryH = Math.max(signatoryEl?.offsetHeight ?? 0, 96);

  return Promise.all([
    headerEl ? domToCanvas(headerEl, { ...captureOpts, width: headerW, height: headerH }) : null,
    footerEl ? domToCanvas(footerEl, { ...captureOpts, width: footerW, height: footerH }) : null,
    hasSignatoryContent && signatoryEl
      ? domToCanvas(signatoryEl, { ...captureOpts, width: signatoryW, height: signatoryH })
      : null,
  ]);
}

/** Capture the main report content as a single tall canvas (null when no element). */
async function captureContentCanvas(
  domToCanvas: DomToCanvas,
  captureOpts: CaptureOpts,
  captureEl: HTMLElement | null,
): Promise<HTMLCanvasElement | null> {
  if (!captureEl) return null;
  const captureW = Math.max(captureEl.scrollWidth || 0, captureEl.offsetWidth || 0, A4_WIDTH_PX);
  const captureH = Math.max(captureEl.scrollHeight || 0, captureEl.offsetHeight || 0);
  const contentWidth = Math.min(Math.max(captureW || 0, A4_WIDTH_PX), A4_WIDTH_PX);
  const contentHeight = Math.max(captureH || 0, 1);
  return domToCanvas(captureEl, {
    ...captureOpts,
    width: contentWidth,
    height: contentHeight,
    style: {
      width: `${contentWidth}px`,
      maxWidth: `${contentWidth}px`,
      boxSizing: 'border-box',
      paddingLeft: `${DEFAULT_REPORT_CONTENT_HPAD_MM}mm`,
      paddingRight: `${DEFAULT_REPORT_CONTENT_HPAD_MM}mm`,
    },
  });
}

type Geometry = {
  cw: number;
  ch: number;
  pageHeightPx: number;
  headerHeightPx: number;
  footerHeightPx: number;
  contentStartY: number;
  signatoryWidthPx: number;
  signatoryHeightPx: number;
  signatoryX: number;
  signatoryY: number;
  contentAreaHeightPx: number;
};

/** Derive all page/header/footer/signatory pixel geometry from the captured canvases. */
function computeGeometry(
  contentCanvas: HTMLCanvasElement,
  headerCanvas: HTMLCanvasElement | null,
  footerCanvas: HTMLCanvasElement | null,
  signatoryCanvas: HTMLCanvasElement | null,
): Geometry {
  const cw = contentCanvas.width;
  const ch = contentCanvas.height;
  const pageHeightPx = (cw * PAGE_HEIGHT_MM) / PAGE_WIDTH_MM;
  const headerHeightPx = headerCanvas ? headerCanvas.height * (cw / headerCanvas.width) : 0;
  const footerHeightPx = footerCanvas ? footerCanvas.height * (cw / footerCanvas.width) : 0;
  const contentStartY = headerHeightPx;

  const signatoryRightPx = 0;
  const signatoryWidthPx = (55 / PAGE_WIDTH_MM) * cw;
  const signatoryHeightPx = signatoryCanvas
    ? signatoryCanvas.height * (signatoryWidthPx / signatoryCanvas.width)
    : 0;
  const signatoryGapPx = (10 / PAGE_HEIGHT_MM) * pageHeightPx;
  const signatoryReservedZonePx =
    signatoryCanvas && signatoryHeightPx > 0 ? signatoryHeightPx + signatoryGapPx : 0;
  const signatoryX = cw - signatoryRightPx - signatoryWidthPx;
  const signatoryY = pageHeightPx - footerHeightPx - signatoryHeightPx - signatoryGapPx;
  const contentAreaHeightPx =
    pageHeightPx - contentStartY - footerHeightPx - signatoryReservedZonePx;

  return {
    cw,
    ch,
    pageHeightPx,
    headerHeightPx,
    footerHeightPx,
    contentStartY,
    signatoryWidthPx,
    signatoryHeightPx,
    signatoryX,
    signatoryY,
    contentAreaHeightPx,
  };
}

/** Measure the report's logical blocks and map them onto content-canvas source rows. */
function computeScaledBlocks(
  captureEl: HTMLElement | null,
  contentEl: HTMLElement | null,
  contentCanvas: HTMLCanvasElement,
  scale: number,
): ScaledBlock[] {
  if (!captureEl) return [];

  const reportContent = contentEl?.querySelector('.report-content');
  const patientInfoEl = reportContent?.querySelector('.patient-info-container');
  const contentWrapper = reportContent?.querySelector('.content-wrapper');
  const sectionEls = contentWrapper
    ? contentWrapper.querySelectorAll(':scope > .content-section')
    : (reportContent?.querySelectorAll('.content-section') ?? []);
  const blockElements = [patientInfoEl, ...Array.from(sectionEls)].filter(Boolean) as HTMLElement[];
  const containerRect = captureEl.getBoundingClientRect();
  const blocks = blockElements.map((el) => {
    const r = el.getBoundingClientRect();
    return { top: r.top - containerRect.top, height: r.height };
  });

  const bufferBottomPx = 2;
  return blocks.map((b, i) => {
    const rawTop = Math.floor(b.top * scale);
    const rawBottom = Math.ceil((b.top + b.height) * scale);
    const nextBlock = blocks[i + 1];
    const nextSourceY =
      i < blocks.length - 1 && nextBlock ? Math.floor(nextBlock.top * scale) : contentCanvas.height;
    const sourceY = i === 0 ? 0 : rawTop;
    const sourceH = Math.min(
      rawBottom - sourceY + bufferBottomPx,
      nextSourceY - sourceY,
      contentCanvas.height - sourceY,
    );
    return { sourceY, sourceH: Math.max(1, sourceH) };
  });
}

/** Slice content into page regions when there are no measured blocks (simple height paging). */
function paginateByHeight(ch: number, contentAreaH: number, contentStartY: number): Region[][] {
  const totalPages = Math.max(1, Math.ceil(ch / contentAreaH));
  const pageRegions: Region[][] = [];
  for (let p = 0; p < totalPages; p++) {
    const sliceY = p * contentAreaH;
    const sliceH = Math.min(contentAreaH, ch - sliceY);
    pageRegions.push([{ sourceY: sliceY, sourceH: sliceH, destY: contentStartY }]);
  }
  return pageRegions;
}

/** Pack measured blocks into pages, keeping blocks intact except when taller than a page. */
function paginateByBlocks(
  scaledBlocks: ScaledBlock[],
  contentAreaH: number,
  contentStartY: number,
): Region[][] {
  const pageRegions: Region[][] = [];
  let remaining = contentAreaH;
  let currentPage: Region[] = [];
  let destY = contentStartY;

  const flush = () => {
    pageRegions.push(currentPage);
    currentPage = [];
    remaining = contentAreaH;
    destY = contentStartY;
  };

  for (const { sourceY, sourceH } of scaledBlocks) {
    const blockH = sourceH;
    const moveToNextPage = blockH > remaining && remaining < contentAreaH;

    if (moveToNextPage) flush();

    if (blockH > contentAreaH) {
      if (currentPage.length > 0) flush();
      currentPage.push({ sourceY, sourceH, destY: contentStartY });
      flush();
    } else {
      currentPage.push({ sourceY, sourceH, destY });
      destY += blockH;
      remaining -= blockH;
    }
  }
  if (currentPage.length > 0) pageRegions.push(currentPage);
  return pageRegions;
}

/** Composite header, content regions, footer, page number, and signatory onto one A4 page canvas. */
function renderPageCanvas(
  page: number,
  totalPages: number,
  regions: Region[],
  contentCanvas: HTMLCanvasElement,
  headerCanvas: HTMLCanvasElement | null,
  footerCanvas: HTMLCanvasElement | null,
  signatoryCanvas: HTMLCanvasElement | null,
  geo: Geometry,
  scale: number,
): HTMLCanvasElement {
  const { cw, pageHeightPx, headerHeightPx, footerHeightPx } = geo;
  const pageCanvas = document.createElement('canvas');
  pageCanvas.width = cw;
  pageCanvas.height = pageHeightPx;
  const ctx = pageCanvas.getContext('2d')!;
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, cw, pageHeightPx);

  if (headerCanvas) {
    ctx.drawImage(headerCanvas, 0, 0, headerCanvas.width, headerCanvas.height, 0, 0, cw, headerHeightPx);
  }
  for (const { sourceY, sourceH, destY: dy } of regions) {
    ctx.drawImage(contentCanvas, 0, sourceY, cw, sourceH, 0, dy, cw, sourceH);
  }
  if (footerCanvas) {
    ctx.drawImage(
      footerCanvas,
      0,
      0,
      footerCanvas.width,
      footerCanvas.height,
      0,
      pageHeightPx - footerHeightPx,
      cw,
      footerHeightPx,
    );
  }
  ctx.fillStyle = '#718096';
  ctx.font = `${Math.round(9 * scale)}px Arial`;
  ctx.textAlign = 'right';
  ctx.textBaseline = 'bottom';
  ctx.fillText(`Page ${page + 1} of ${totalPages}`, cw - 20, pageHeightPx - 10);
  if (signatoryCanvas && geo.signatoryHeightPx > 0 && geo.signatoryY >= 0) {
    ctx.drawImage(
      signatoryCanvas,
      0,
      0,
      signatoryCanvas.width,
      signatoryCanvas.height,
      geo.signatoryX,
      geo.signatoryY,
      geo.signatoryWidthPx,
      geo.signatoryHeightPx,
    );
  }
  return pageCanvas;
}

/** Generate a paginated A4 PDF from report HTML with header/footer on every page. */
export async function generateClinicalReportPdfBlobFromHtml(htmlContent: string): Promise<Blob> {
  if (!htmlContent.trim()) {
    throw new Error('Report HTML content is empty');
  }

  const { iframe, iframeDoc } = createCaptureIframe(htmlContent);
  const injectStyle = makeStyleInjector(iframeDoc);

  injectStyle(FORCE_REPORT_WIDTH_CSS);
  injectStyle(FORCE_TABLE_ALIGN_CSS);
  injectStyle(SIGNATORY_HIGH_RES_CSS(SIGNATORY_CAPTURE_WIDTH_PX));
  injectStyle(PAGE_NUMBER_FOOTER_CSS);

  await waitForIframeLoad(iframe, iframeDoc);

  await inlineReportLogoForPdfCapture(iframeDoc);
  await replaceExternalReportImagesWithDataUrls(iframeDoc);
  await waitForReportImagesReady(iframeDoc);
  await new Promise((r) => window.setTimeout(r, 100));

  try {
    const { domToCanvas } = await import('modern-screenshot');
    const { jsPDF } = await import('jspdf');
    const scale = PDF_DOM_CAPTURE_SCALE;
    const captureOpts: CaptureOpts = { scale, backgroundColor: '#ffffff', timeout: 15000 };

    const contentEl = iframeDoc.querySelector('.report-print-root') as HTMLElement | null;
    const headerEl = iframeDoc.querySelector('.report-header') as HTMLElement | null;
    const footerEl = iframeDoc.querySelector('.report-footer') as HTMLElement | null;
    const signatoryEl = iframeDoc.querySelector('.report-signatory') as HTMLElement | null;
    const hasSignatoryContent = hasRenderableSignatory(signatoryEl);

    const contentElForCapture = contentEl?.querySelector('.report-content') as HTMLElement | null;
    const captureEl = contentElForCapture || contentEl;

    if (hasSignatoryContent && signatoryEl?.querySelector('img.report-signature-img')) {
      await waitForReportImagesReady(signatoryEl);
    }

    await new Promise((r) => window.setTimeout(r, 20));

    const [headerCanvas, footerCanvas, signatoryCanvas] = await captureChromeCanvases(
      domToCanvas,
      captureOpts,
      { captureEl, headerEl, footerEl, signatoryEl, hasSignatoryContent },
    );

    injectStyle(CONTENT_NO_MARGIN_CSS);
    await new Promise((r) => window.setTimeout(r, 10));

    const contentCanvas = await captureContentCanvas(domToCanvas, captureOpts, captureEl);

    if (!contentCanvas || contentCanvas.width === 0 || contentCanvas.height === 0) {
      throw new Error('Report content not found or has zero size');
    }

    const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4', compress: true });
    const geo = computeGeometry(contentCanvas, headerCanvas, footerCanvas, signatoryCanvas);

    const scaledBlocks = computeScaledBlocks(captureEl, contentEl, contentCanvas, scale);

    const contentAreaH = geo.contentAreaHeightPx;
    const pageRegions =
      scaledBlocks.length === 0
        ? paginateByHeight(geo.ch, contentAreaH, geo.contentStartY)
        : paginateByBlocks(scaledBlocks, contentAreaH, geo.contentStartY);
    const totalPages = Math.max(1, pageRegions.length);

    for (let page = 0; page < totalPages; page++) {
      const regions = pageRegions[page] ?? [];
      const pageCanvas = renderPageCanvas(
        page,
        totalPages,
        regions,
        contentCanvas,
        headerCanvas,
        footerCanvas,
        signatoryCanvas,
        geo,
        scale,
      );

      const pageImg = pageCanvas.toDataURL('image/png');
      if (page > 0) pdf.addPage();
      pdf.addImage(pageImg, 'PNG', 0, 0, PAGE_WIDTH_MM, PAGE_HEIGHT_MM);
    }

    return pdf.output('blob') as Blob;
  } finally {
    if (iframe.parentNode) document.body.removeChild(iframe);
  }
}

export async function printClinicalReportFromHtml(html: string): Promise<void> {
  const blob = await generateClinicalReportPdfBlobFromHtml(html);
  printClinicalReportPdfBlob(blob);
}
