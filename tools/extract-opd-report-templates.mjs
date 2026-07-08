/**
 * One-time extractor: copies OPD slip + OPD billing HTML from hims-frontend-ai-based
 * into @hims/registration-reports with server-safe adaptations.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const himsTemplates = path.resolve(
  root,
  "../hims-frontend-ai-based/src/reports/templates/reportTemplates.ts",
);
const outDir = path.resolve(root, "packages/registration-reports/src");
const outFile = path.join(outDir, "opd-templates.generated.ts");

const src = fs.readFileSync(himsTemplates, "utf8");
const lines = src.split(/\r?\n/);

function slice(start, end) {
  return lines.slice(start - 1, end).join("\n");
}

const header = `/**
 * AUTO-GENERATED from hims-frontend-ai-based reportTemplates.ts — do not hand-edit.
 * Regenerate: node tools/extract-opd-report-templates.mjs
 */
import { REPORT_A4_PRINT_STYLES } from "./print-styles.js";
import {
  buildOpdSlipPatientNameLine,
  formatAbha,
  formatAddressForDisplay,
} from "./formatters.js";
import { formatReceiptRs } from "./currency.js";
import { roundBillingRupee, opdBillLevelDiscountGrossRupeePerLine } from "./billing-math.js";
import { buildOpdSlipBarcodeHtml } from "./barcode.js";
import type {
  DoctorInfo,
  OPDSlipReportPayload,
  OPDBillingLineItem,
  OPDBillingReportPayload,
  PrintTemplateConfig,
} from "./types.js";
import { resolveReportLogoUrl } from "./logo.js";

let defaultLogoUrl = "/reportLogo.png";

export function setDefaultReportLogoUrl(url: string): void {
  defaultLogoUrl = url.trim() || "/reportLogo.png";
}

function getReportLogoPublicUrl(): string {
  return resolveReportLogoUrl(defaultLogoUrl);
}

function isGimsFacilityId(facilityId: string | null | undefined): boolean {
  if (!facilityId) return false;
  const id = String(facilityId).trim().toLowerCase();
  return id === "gims" || id.includes("gims");
}

function isSanjivaniFacilityId(facilityId: string | null | undefined): boolean {
  if (!facilityId) return false;
  const id = String(facilityId).trim().toLowerCase();
  return id.includes("sanjivani");
}

`;

const body = [
  slice(32, 245),
  slice(1276, 1595),
  slice(1597, 1758),
  slice(1761, 1966),
  slice(1972, 2143),
  slice(2145, 2622),
]
  .join("\n\n")
  .replace(
    /import[\s\S]*?from '@\/reports\/utils\/reportVitalsHtml';\n/,
    "",
  )
  .replace(/import[\s\S]*?from '@\/utils\/safePrintHtml';\n/, "")
  .replace(/import[\s\S]*?from '\.\.\/utils\/reportVitalsHtml';\n/, "")
  .replace(/import[\s\S]*?from '@\/utils\/currency';\n/, "")
  .replace(/import[\s\S]*?from '@\/utils\/constants';\n/, "")
  .replace(/import[\s\S]*?from '@\/reports\/utils\/reportFormatters';\n/, "")
  .replace(/import[\s\S]*?from '@\/utils\/reportLogo';\n/, "")
  .replace(/import[\s\S]*?from '@\/reports\/templates\/reportPrintStyles';\n/, "")
  .replace(/import[\s\S]*?from '@\/services\/reportService';\n[\s\S]*?\n/, "")
  .replace(/import[\s\S]*?from '@\/reports\/engine\/reportTypes';\n/, "")
  .replace(/import[\s\S]*?from '@\/components\/shared\/PrintTemplate';\n[\s\S]*?\n/, "")
  .replace(/import JsBarcode from 'jsbarcode';\n/, "")
  .replace(/import \{ buildOpConsultationVitalsSectionHtml \}[\s\S]*?\n/, "")
  .replace(
    /export function renderOPDSlipHtml\(payload: OPDSlipReportPayload\): string \{\n  const gimsFacility =\n    typeof window !== 'undefined' && isGimsFacilityId\(localStorage\.getItem\('facilityId'\)\);/,
    `export function renderOPDSlipHtml(payload: OPDSlipReportPayload): string {
  const gimsFacility =
    payload.useGimsLayout === true ||
    isGimsFacilityId(payload.facilityInfo?.facilityId ?? payload.layoutConfig?.facilityId);`,
  )
  .replace(
    /const opdEmblemSanjivaniClass =\n    typeof window !== 'undefined' && isSanjivaniFacilityId\(localStorage\.getItem\('facilityId'\)\)\n      \? ' emblem-circle--sanjivani'\n      : '';/,
    `const opdEmblemSanjivaniClass =
    isSanjivaniFacilityId(payload.facilityInfo?.facilityId ?? payload.layoutConfig?.facilityId)
      ? ' emblem-circle--sanjivani'
      : '';`,
  )
  .replace(
    /export function buildOpdSlipBarcodeHtml\([\s\S]*?\n\}/,
    "// buildOpdSlipBarcodeHtml imported from ./barcode.js",
  )
  .replace(/const OPD_SLIP_JSBARCODE_OPTIONS[\s\S]*?};\n\n/, "")
  .replace(/\/\*\* CODE128 SVG[\s\S]*?\*\/\n/, "")
  // Server-side tsconfig uses `noUncheckedIndexedAccess`; guard the indexed access
  // in splitFacilityAddressForOpdSlipHeader (length-guards don't narrow it away).
  .replace(
    "if (parts.length === 1) return { line1: parts[0], line2: '' };\n  if (parts.length === 2) return { line1: parts[0], line2: parts[1] };",
    "if (parts.length === 1) return { line1: parts[0] ?? '', line2: '' };\n  if (parts.length === 2) return { line1: parts[0] ?? '', line2: parts[1] ?? '' };",
  );

const exports = `
export { buildReportHeaderHtml, buildReportFooterHtml, getReportFooterLines, escapeHtml };
`;

fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(outFile, header + body + exports, "utf8");
console.log(`Wrote ${outFile} (${(header + body).split("\n").length} lines)`);
