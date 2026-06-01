import { JSDOM } from "jsdom";
import JsBarcode from "jsbarcode";

const OPD_SLIP_JSBARCODE_OPTIONS = {
  format: "CODE128" as const,
  width: 2.5,
  height: 120,
  displayValue: false,
  margin: 0,
  marginTop: 0,
  background: "#FFFFFF",
  lineColor: "#000000",
};

export function buildOpdSlipBarcodeHtml(
  visitNumber: string,
  options?: { showBarcode?: boolean },
): string {
  const showBarcode = options?.showBarcode !== false;
  const safe = String(visitNumber ?? "").trim();
  if (!safe) return "";

  const hiddenClass = showBarcode ? "" : " opd-slip-header-barcode--hidden";

  try {
    const dom = new JSDOM("");
    const svg = dom.window.document.createElementNS("http://www.w3.org/2000/svg", "svg");
    JsBarcode(svg, safe, OPD_SLIP_JSBARCODE_OPTIONS);
    svg.setAttribute("class", "opd-slip-barcode-svg");
    svg.setAttribute("aria-label", "Visit ID barcode");
    return `<div class="opd-slip-header-barcode${hiddenClass}">${svg.outerHTML}</div>`;
  } catch {
    return `<div class="opd-slip-header-barcode${hiddenClass}"></div>`;
  }
}
