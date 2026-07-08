/**
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

export function escapeHtml(str: string | number | undefined | null): string {
  if (str === undefined || str === null) return '';
  const s = String(str);
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/** Resolve test display name from any shape: string, populated object, null, boolean. */
function resolveTestDisplayName(test: Record<string, unknown>): string {
  const t = test.test;
  if (typeof t === 'string' && t.trim()) return t.trim();
  if (t && typeof t === 'object') {
    const obj = t as Record<string, unknown>;
    if (typeof obj.test_name === 'string' && obj.test_name.trim()) return obj.test_name.trim();
  }
  if (typeof test.name === 'string' && (test.name as string).trim()) return (test.name as string).trim();
  return '';
}

/** Safe format date for print; returns '-' if invalid */
function formatDateSafe(dateStr: string | null | undefined): string {
  if (!dateStr) return '-';
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return '-';
  const day = date.getDate().toString().padStart(2, '0');
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const year = date.getFullYear();
  return `${day}-${month}-${year}`;
}

/** Safe format date+time (IST) for print; returns '-' if invalid */
function formatDateTimeSafeIST(dateStr: string | null | undefined): string {
  if (!dateStr) return '-';
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return '-';
  return date.toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata' }) + ' ' + date.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true, timeZone: 'Asia/Kolkata' });
}

/** Minimal config for footer lines. Used by both HTML builder and modal (PrintableReportTemplate) so footer is single source. */
export interface ReportFooterConfig {
  facilityName?: string;
  facilityAddress?: string;
  footerText?: string;
}

/** Canonical report footer lines (order and content). Use this in buildReportFooterHtml and in PrintableReportTemplate so modal and generated report match. */
export function getReportFooterLines(config: ReportFooterConfig): {
  generatedOn: string;
  facilityLine: string;
  addressLine: string | null;
} {
  const generatedOn = new Date().toLocaleDateString('en-IN');
  const facilityLine = (config.footerText || config.facilityName || '').trim();
  const addressLine = (config.facilityAddress || '').trim() || null;
  return { generatedOn, facilityLine, addressLine };
}

/** Shared report header (logo + facility). Logo from public/reportLogo.png (same origin); PDF pipeline inlines as data URL before capture. */
export function buildReportHeaderHtml(config: PrintTemplateConfig, logo: string): string {
  const logoUrl = logo || getReportLogoPublicUrl();
  const isSanjivaniLogo = isSanjivaniFacilityId(config.facilityId);
  const reportLogoClass = isSanjivaniLogo ? 'report-logo report-logo--sanjivani' : 'report-logo';
  const phoneTrimmed = (config.facilityPhone || '').trim();
  const phoneRow = phoneTrimmed
    ? `<div class="report-facility-details">Phone: ${escapeHtml(phoneTrimmed)}</div>`
    : '';
  return `
    <header class="report-header">
      <div class="${reportLogoClass}"><img src="${escapeHtml(logoUrl)}" alt="" class="logo-image"></div>
      <div class="report-facility">
        <div class="report-facility-name">${escapeHtml(config.facilityName)}</div>
        <div class="report-facility-details">Facility ID: ${escapeHtml(config.facilityId)}</div>
        <div class="report-facility-details">${escapeHtml(config.facilityEmail)}</div>
        ${phoneRow}
      </div>
    </header>`;
}

/** Split stored facility address into two lines for OPD slip header (comma-separated parts). */
export function splitFacilityAddressForOpdSlipHeader(address: string): { line1: string; line2: string } {
  const s = (address || '').trim();
  if (!s) return { line1: '', line2: '' };
  const parts = s.split(',').map((p) => p.trim()).filter(Boolean);
  if (parts.length === 1) return { line1: parts[0] ?? '', line2: '' };
  if (parts.length === 2) return { line1: parts[0] ?? '', line2: parts[1] ?? '' };
  const mid = Math.ceil(parts.length / 2);
  return { line1: parts.slice(0, mid).join(', '), line2: parts.slice(mid).join(', ') };
}

const OPD_SLIP_PHONE_ICON_SVG =
  '<svg class="opd-slip-header-icon opd-slip-header-icon-phone" width="14" height="14" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><path d="M6.62 10.79c1.44 2.83 3.76 5.14 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z" fill="#db2777"/></svg>';

const OPD_SLIP_MAIL_ICON_SVG =
  '<svg class="opd-slip-header-icon opd-slip-header-icon-mail" width="14" height="14" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><path d="M20 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z" fill="#6b7280"/></svg>';

/** CODE128 bars only (no text under bars; RegistrationCard still shows value). */
/**
 * OPD slip barcode: CODE128 SVG via jsbarcode (same stack as RegistrationCard).
 * No border, no data attribute, no human-readable line under bars. Empty wrapper if generation fails.
 * When `showBarcode` is false (doctor without Smart Parcha), the SVG is still laid out but hidden so the slip keeps the same whitespace.
 */
// buildOpdSlipBarcodeHtml imported from ./barcode.js

/**
 * OPD slip header: emblem | facility + address + contact | CODE128 barcode (RegistrationCard-compatible).
 */
export function buildOpdSlipHeaderHtml(
  config: PrintTemplateConfig,
  logoUrl: string,
  visitNumber: string,
  barcodeOptions?: { showBarcode?: boolean }
): string {
  const name = (config.facilityName || '').trim();
  const { line1, line2 } = splitFacilityAddressForOpdSlipHeader(config.facilityAddress || '');
  const phoneRaw = (config.facilityPhone || '').trim();
  const emailRaw = (config.facilityEmail || '').trim();
  const barcodeHtml = buildOpdSlipBarcodeHtml(visitNumber, barcodeOptions);

  const contactParts: string[] = [];
  if (phoneRaw) {
    contactParts.push(
      '<span class="opd-slip-header-contact-item">' +
        OPD_SLIP_PHONE_ICON_SVG +
        '<span>' +
        escapeHtml(phoneRaw) +
        '</span></span>'
    );
  }
  if (emailRaw) {
    if (contactParts.length > 0) {
      contactParts.push('<span class="opd-slip-header-contact-sep"></span>');
    }
    contactParts.push(
      '<span class="opd-slip-header-contact-item">' +
        OPD_SLIP_MAIL_ICON_SVG +
        '<span>' +
        escapeHtml(emailRaw) +
        '</span></span>'
    );
  }
  const contactRow =
    contactParts.length > 0 ? `<div class="opd-slip-header-contact">${contactParts.join('')}</div>` : '';

  return (
    '\n    <header class="opd-slip-header" role="banner">\n      <div class="opd-slip-header-emblem">\n        <div class="opd-slip-header-emblem-circle">\n          <img src="' +
    escapeHtml(logoUrl) +
    '" alt="" class="opd-slip-header-emblem-img" />\n        </div>\n      </div>\n      <div class="opd-slip-header-facility">\n        <div class="opd-slip-header-name">' +
    escapeHtml(name) +
    '</div>\n        ' +
    (line1 ? '<div class="opd-slip-header-address-line">' + escapeHtml(line1) + '</div>\n        ' : '') +
    (line2 ? '<div class="opd-slip-header-address-line">' + escapeHtml(line2) + '</div>\n        ' : '') +
    contactRow +
    (contactRow ? '\n        ' : '') +
    '</div>\n      <div class="opd-slip-header-barcode-col">\n        ' +
    barcodeHtml +
    '\n      </div>\n    </header>'
  );
}

/** Shared report footer. Uses getReportFooterLines so order/content match PrintableReportTemplate (modal). */
export function buildReportFooterHtml(config: PrintTemplateConfig): string {
  const { generatedOn, facilityLine, addressLine } = getReportFooterLines(config);
  return `
    <footer class="report-footer">
      <div class="report-page-number"></div>
      <div class="report-timestamp">Generated on: ${escapeHtml(generatedOn)}</div>
      <div>${escapeHtml(facilityLine)}</div>
      ${addressLine ? `<div>${escapeHtml(addressLine)}</div>` : ''}
    </footer>`;
}

const OPD_SLIP_STYLES = `
  .report-print-root.opd-slip-root {
    width: auto !important;
    min-height: auto !important;
    max-width: none !important;
    display: block !important;
    margin: 0 !important;
    padding: 0 !important;
    background: #fff;
  }
  .report-print-root.opd-slip-root .report-content {
    margin: 0 !important;
    padding: 0 !important;
    max-width: none !important;
    min-height: auto !important;
  }
  .report-print-root.opd-slip-root .report-footer,
  .report-print-root.opd-slip-root .report-signatory {
    display: none !important;
  }
  .opd-slip {
    background: #fff;
    width: 210mm;
    min-height: 297mm;
    padding: 6mm 6mm 8mm 6mm;
    margin: 0 auto;
    box-sizing: border-box;
    display: flex;
    flex-direction: column;
    font-family: Arial, sans-serif;
    font-size: 15.5px;
    line-height: 1.3;
    color: #000;
  }
  .opd-visit-id {
    font-size: 14.5px;
    font-weight: 700;
    color: #333;
    margin-bottom: 6px;
  }
  .opd-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    margin-top: 0;
    margin-bottom: 8px;
    width: 100%;
  }
  .opd-doctor-block {
    flex: 1 1 0;
    text-align: right;
    min-width: 0;
  }
  .opd-doctor-name {
    font-size: 17px;
    font-weight: 700;
    color: #1e3a5f;
    margin-bottom: 2px;
  }
  .opd-doctor-spec,
  .opd-doctor-room,
  .opd-doctor-reg {
    font-size: 13.5px;
    color: #333;
    line-height: 1.2;
    margin-bottom: 1px;
  }
  .opd-barcode-center {
    flex: 1 1 0;
    display: flex;
    justify-content: center;
    align-items: flex-start;
    min-width: 0;
  }
  .opd-barcode-wrap {
    width: 60mm;
    max-width: 100%;
    box-sizing: border-box;
    padding: 6px;
    background: #fff;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  .opd-barcode-wrap .opd-slip-header-barcode {
    width: 100%;
    display: flex;
    justify-content: center;
  }
  .opd-barcode-wrap .opd-slip-barcode-svg {
    display: block;
    width: 100%;
    height: auto;
  }
  .opd-slip-header-barcode--hidden,
  .opd-slip-header-barcode--hidden .opd-slip-barcode-svg {
    visibility: hidden;
  }
  .opd-logo-block {
    flex: 1 1 0;
    display: flex;
    justify-content: flex-start;
    align-items: flex-start;
    align-self: center;
    min-width: 0;
  }
  .opd-logo-wrapper {
    display: flex;
    flex-direction: column;
    align-items: center;
  }
  .emblem-circle {
    width: 22mm;
    aspect-ratio: 1 / 1;
    display: flex;
    align-items: center;
    justify-content: center;
    background: #fff;
  }
  .emblem-circle--sanjivani {
    width: 60mm;
    aspect-ratio: auto;
  }
  .emblem-image {
    width: 100%;
    height: 100%;
    object-fit: contain;
  }
  .emblem-circle--sanjivani .emblem-image {
    width: 100%;
    height: auto;
  }
  .opd-divider {
    height: 1px;
    background: #000;
    box-sizing: border-box;
  }
  .opd-divider--full-bleed {
    margin: 4px -6mm;
  }
  .opd-divider--inset {
    margin: 4px 0;
    width: 100%;
  }
  .opd-patient-section {
    margin: 2px 0;
  }
  .opd-patient-row {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    gap: 8px;
    margin-bottom: 2px;
  }
  .opd-patient-name {
    font-size: 17px;
    font-weight: 700;
    color: #1e3a5f;
  }
  .opd-patient-mobile {
    font-size: 14.5px;
    color: #555;
    white-space: nowrap;
  }
  .opd-patient-ids {
    width: 100%;
    font-size: 14.5px;
    line-height: 1.35;
    color: #333;
    text-align: left;
  }
  .opd-patient-ids-item {
    display: inline-block;
    white-space: nowrap;
    vertical-align: baseline;
  }
  .opd-patient-ids-item--token-address {
    display: inline;
    white-space: normal;
  }
  .notes-section {
    flex: 1;
    min-height: 0;
    display: flex;
    flex-direction: column;
    margin: 4px 0 0 0;
    position: relative;
  }
  .smart-parcha-pages {
    flex: 1;
    min-height: 0;
    width: 100%;
    display: flex;
    flex-direction: column;
    gap: 12px;
  }
  .smart-parcha-page {
    width: 100%;
    display: flex;
    flex-direction: column;
    align-items: center;
    position: relative;
  }
  .smart-parcha-page.first-page {
    flex: 1;
    min-height: 0;
    justify-content: stretch;
  }
  .smart-parcha-page img {
    width: 100%;
    max-width: 100%;
    display: block;
    page-break-inside: avoid;
    border: 0;
  }
  .smart-parcha-page.first-page img {
    height: auto;
    object-fit: contain;
    object-position: top left;
  }
  .smart-parcha-page.subsequent-page img {
    height: auto;
    object-fit: contain;
  }
  .smart-parcha-empty {
    display: none;
  }
  .smart-parcha-page.last-page {
    position: relative;
  }
  .opd-sig-overlay {
    position: absolute;
    right: -4px;
    bottom: -4px;
    min-width: 120px;
    max-width: 180px;
    padding: 6px 8px;
    background: rgba(255, 255, 255, 0.92);
    z-index: 10;
    text-align: center;
  }
  .opd-sig-overlay-content {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 2px;
  }
  .opd-sig-image {
    width: 60px;
    height: 40px;
    object-fit: contain;
  }
  .opd-sig-name {
    font-size: 12px;
    font-weight: 700;
    color: #1e3a5f;
    line-height: 1.3;
    white-space: nowrap;
  }
  .opd-sig-dept {
    font-size: 11px;
    color: #374151;
    line-height: 1.3;
    white-space: nowrap;
  }
  .opd-sig-reg {
    font-size: 10.5px;
    color: #6b7280;
    line-height: 1.3;
    white-space: nowrap;
  }
  @media print {
    @page {
      size: A4 portrait;
      margin: 0;
    }
    body {
      margin: 0;
      padding: 0;
    }
    .opd-slip {
      width: 210mm;
      min-height: 297mm;
      padding: 6mm 6mm 8mm 6mm !important;
      margin: 0;
      box-shadow: none;
      border: none;
      transform: none !important;
      overflow: visible !important;
      box-sizing: border-box !important;
      font-size: 15.5px !important;
      line-height: 1.3 !important;
      page-break-inside: auto !important;
    }
    .opd-slip,
    .opd-slip * {
      color: #000 !important;
      background: #fff !important;
    }
    .smart-parcha-page {
      page-break-inside: avoid;
      break-inside: avoid;
      min-height: 0;
    }
    .smart-parcha-page img {
      box-shadow: none;
      border: 0;
    }
    .smart-parcha-page.first-page img {
      min-height: 0;
    }
  }
  @media screen {
    .opd-slip {
      max-width: 210mm;
      margin: 0 auto;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
    }
  }
`;

const GIMS_OPD_SLIP_STYLES = `
  .gims-slip .opd-header {
    flex-direction: column;
    align-items: stretch;
  }
  .gims-slip .gims-institution-banner {
    text-align: center;
    margin-bottom: 6px;
  }
  .gims-slip .gims-institution-hindi {
    font-size: 17px;
    font-weight: 700;
    color: #000;
    line-height: 1.3;
  }
  .gims-slip .gims-institution-english {
    font-size: 16px;
    font-weight: 700;
    color: #000;
    line-height: 1.3;
  }
  .gims-slip .gims-header-columns {
    display: flex;
    justify-content: space-between;
    align-items: center;
    width: 100%;
  }
  .gims-slip .gims-doctor-block {
    flex: 1 1 0;
    min-width: 0;
    text-align: left;
  }
  .gims-slip .gims-doctor-name {
    font-size: 17px;
    font-weight: 700;
    color: #15294B;
    margin-bottom: 1px;
  }
  .gims-slip .gims-doctor-dept {
    font-size: 13.5px;
    color: #555;
    margin-bottom: 1px;
  }
  .gims-slip .gims-doctor-reg,
  .gims-slip .gims-doctor-room {
    font-size: 13.5px;
    color: #333;
    line-height: 1.3;
  }
  .gims-slip .gims-barcode-col {
    flex: 1 1 0;
    display: flex;
    justify-content: center;
    align-items: center;
    min-width: 0;
  }
  .gims-slip .opd-barcode-wrap {
    width: 70mm;
  }
  .gims-slip .gims-logo-col {
    flex: 1 1 0;
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    justify-content: center;
    min-width: 0;
  }
  .gims-slip .gims-emblem {
    width: 22mm;
    aspect-ratio: 1 / 1;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  .gims-slip .gims-emblem img {
    width: 100%;
    height: 100%;
    object-fit: contain;
  }
  .gims-slip .gims-visit-date {
    font-size: 14px;
    font-weight: 700;
    color: #000;
    text-align: right;
    margin-top: 4px;
  }
  .gims-slip .gims-divider {
    height: 2px;
    background: #000;
    margin: 6px -6mm;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }
  .gims-slip .gims-patient-row {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    gap: 8px;
    margin-bottom: 3px;
  }
  .gims-slip .gims-patient-name {
    font-size: 17px;
    font-weight: 700;
    color: #15294B;
    white-space: nowrap;
  }
  .gims-slip .gims-patient-uhid {
    font-size: 14.5px;
    font-weight: 600;
    color: #000;
    white-space: nowrap;
  }
  .gims-slip .gims-patient-details {
    font-size: 14px;
    line-height: 1.5;
    color: #333;
  }
  .gims-slip .gims-investigations {
    display: flex;
    margin-top: auto;
    padding-top: 10px;
    flex: 1;
    min-height: 0;
  }
  .gims-slip .gims-investigations-label {
    font-size: 16px;
    font-weight: 700;
    color: #15294B;
    flex-shrink: 0;
    padding-top: 4px;
  }
  .gims-slip .gims-investigations-divider {
    width: 2px;
    border: none;
    background: #9ca3af;
    flex-shrink: 0;
    align-self: stretch;
    margin-left: 10mm;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }
  .gims-slip .gims-investigations-content {
    flex: 1;
    min-width: 0;
  }
  .gims-slip .gims-top-spacer {
    flex: 1;
    min-height: 70mm;
  }
  @media print {
    .gims-slip .gims-divider {
      background: #000 !important;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
    .gims-slip .gims-investigations-divider {
      background: #9ca3af !important;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
  }
`;

function formatOpdSlipFreeFollowUpValidTillDisplay(isoOrDateStr: string | undefined): string {
  if (!isoOrDateStr || String(isoOrDateStr).trim() === '') return '—';
  const date = new Date(isoOrDateStr);
  if (isNaN(date.getTime())) return '—';
  return date.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });
}

function visitIsFreeFollowUpForOpdSlip(v: { consultationType?: string; visitType?: string }): boolean {
  const c = String(v.consultationType ?? '')
    .trim()
    .toLowerCase()
    .replace(/_/g, '-');
  const vt = String(v.visitType ?? '')
    .trim()
    .toLowerCase()
    .replace(/_/g, '-');
  return c === 'free-followup' || vt === 'free-followup';
}

function formatOpdSlipPatientType(priority: string | undefined): string {
  const normalized = String(priority ?? '').trim().toLowerCase();
  if (normalized === 'urgent' || normalized === 'emergency') return 'Urgent';
  return 'General';
}

/** Visit date + time for OPD slip details row (label stays "Visit date") : DD-MM-YYYY, h:mm AM/PM. */
function formatOpdSlipVisitDate(dateStr: string | undefined): string {
  if (!dateStr) return '—';
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return '—';
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = String(date.getFullYear());
  const timeStr = date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  });
  return `${day}-${month}-${year}, ${timeStr}`;
}

function formatOpdSlipAge(age?: number, months?: number, days?: number): string {
  if (typeof age === 'number' && age > 0) return String(age);
  if (typeof months === 'number' && months > 0) return `${months}m`;
  if (typeof days === 'number' && days > 0) return `${days}d`;
  return '--';
}

function formatGimsVisitDate(dateStr: string | undefined): string {
  if (!dateStr) return '—';
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return '—';
  const months = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
  const day = String(date.getDate()).padStart(2, '0');
  return `${day}-${months[date.getMonth()]}-${date.getFullYear()}`;
}

function renderGimsOpdSlipHtml(payload: OPDSlipReportPayload): string {
  const {
    patientData: p,
    visitData: v,
    doctorInfo,
    smartParchaPages = [],
    showDoctorSignature = false,
    smartParchaEnabled
  } = payload;
  const showOpdSlipBarcode = smartParchaEnabled !== false;

  const patientNameShort = [p.firstName, p.middleName, p.lastName]
    .filter((part) => part != null && String(part).trim() !== '')
    .map((part) => String(part).trim())
    .join(' ') || '—';
  const patientGender = (p.gender || '').trim() ? (p.gender || '').trim().charAt(0).toUpperCase() : '';
  const patientAge = formatOpdSlipAge(p.age, p.months, p.days);
  const patientMeta = [patientGender, patientAge !== '--' ? patientAge : ''].filter(Boolean).join(', ');
  const patientMetaSuffix = patientGender || patientAge !== '--' ? ` (${patientMeta})` : '';
  const patientLine = `${patientNameShort}${patientMetaSuffix}`;

  const doctorName = (v.doctor?.name || doctorInfo?.name || '').trim() || 'NA';
  const doctorNameDisplay = doctorName === 'NA' ? 'NA' : (/^dr\.?\s/i.test(doctorName) ? doctorName : `Dr. ${doctorName}`);
  const departmentName = (v.department?.name || '').trim() || '';
  const doctorRegistrationNumber = (doctorInfo?.regNumber ?? '').trim();
  const roomNumber = (v.roomNumber != null && String(v.roomNumber).trim() !== '') ? String(v.roomNumber).trim() : '';
  const doctorSignature = showDoctorSignature ? (doctorInfo?.signature ?? '').trim() : '';

  const uhidDisplay = escapeHtml(p.uhid || '--');
  const visitDateDisplay = formatGimsVisitDate(v.createdAt);
  const dobDisplay = formatDateSafe(p.dateOfBirth || undefined);
  const patientTypeDisplay = formatOpdSlipPatientType(v.priority);
  const validTill = visitIsFreeFollowUpForOpdSlip(v)
    ? formatOpdSlipFreeFollowUpValidTillDisplay((v as { freeFollowUpValidTill?: string }).freeFollowUpValidTill)
    : formatOpdSlipFreeFollowUpValidTillDisplay((v as { visitValidTill?: string }).visitValidTill);
  const feesTrimmed = v.fees != null && String(v.fees).trim() !== '' ? String(v.fees).trim() : '';
  const feesSegment = feesTrimmed ? `Fees : ${escapeHtml(feesTrimmed)}` : '';

  const DAY_ORDER: Record<string, number> = { mon: 0, tue: 1, wed: 2, thu: 3, fri: 4, sat: 5, sun: 6 };
  const opdDays = Array.isArray(v.opdDays) && v.opdDays.length > 0
    ? [...v.opdDays].sort((a, b) => (DAY_ORDER[a.toLowerCase().slice(0, 3)] ?? 99) - (DAY_ORDER[b.toLowerCase().slice(0, 3)] ?? 99)).join(', ')
    : '';

  const barcodeHtml = buildOpdSlipBarcodeHtml(v.visitNumber || '', { showBarcode: showOpdSlipBarcode });

  const signatureOverlayHtml = showDoctorSignature && doctorSignature ? `
    <div class="opd-sig-overlay">
      <div class="opd-sig-overlay-content">
        ${doctorRegistrationNumber ? `<div class="opd-sig-reg">Reg No: ${escapeHtml(doctorRegistrationNumber)}</div>` : ''}
        <img src="${escapeHtml(doctorSignature)}" alt="Doctor Signature" class="opd-sig-image" />
        <div class="opd-sig-name">${escapeHtml(doctorNameDisplay !== 'NA' ? doctorNameDisplay : doctorName)}</div>
        ${departmentName ? `<div class="opd-sig-dept">${escapeHtml(departmentName)}</div>` : ''}
      </div>
    </div>` : '';

  const smartParchaHtml = smartParchaPages.length > 0
    ? `
    <div class="notes-section">
      <div class="smart-parcha-pages">
        ${smartParchaPages.map((page, index) => {
          const isLast = index === smartParchaPages.length - 1;
          return `
          <div class="smart-parcha-page ${index === 0 ? 'first-page' : 'subsequent-page'}${isLast ? ' last-page' : ''}">
            <img src="${escapeHtml(page.content)}" alt="Smart Parcha Page ${page.pageNumber}" />
            ${isLast ? signatureOverlayHtml : ''}
          </div>`;
        }).join('')}
      </div>
    </div>`
    : `<div class="gims-investigations">
        <div class="gims-investigations-label">Investigations</div>
        <div class="gims-investigations-divider"></div>
        <div class="gims-investigations-content"></div>
      </div>`;

  const detailLine1Parts = [
    `Visit ID : ${escapeHtml(v.visitNumber || '--')}`,
    `DOB : ${escapeHtml(dobDisplay)}`,
    `Patient Type : ${escapeHtml(patientTypeDisplay)}`,
    `Valid Till : ${escapeHtml(validTill)}`,
    feesSegment
  ].filter(Boolean);

  const detailLine2Parts = [
    opdDays ? `OPD Days : ${escapeHtml(opdDays)}` : ''
  ].filter(Boolean);

  const bodyContent = `
    <div class="opd-header">
      <div class="gims-institution-banner">
        <div class="gims-institution-hindi">राजकीय आयुर्विज्ञान संस्थान, ग्रेटर नोएडा</div>
        <div class="gims-institution-english">Government Institute of Medical Sciences, Greater Noida</div>
      </div>
      <div class="gims-header-columns">
        <div class="gims-doctor-block">
          <div class="gims-doctor-name">${escapeHtml(doctorNameDisplay)}</div>
          ${departmentName ? `<div class="gims-doctor-dept">${escapeHtml(departmentName)}</div>` : ''}
          ${doctorRegistrationNumber ? `<div class="gims-doctor-reg">Reg. No. : ${escapeHtml(doctorRegistrationNumber)}</div>` : ''}
          ${roomNumber ? `<div class="gims-doctor-room">Room No. : ${escapeHtml(roomNumber)}</div>` : ''}
        </div>
        <div class="gims-barcode-col">
          <div class="opd-barcode-wrap">${barcodeHtml}</div>
        </div>
        <div class="gims-logo-col">
          <div class="gims-emblem">
            <img src="${escapeHtml(getReportLogoPublicUrl())}" alt="" />
          </div>
          <div class="gims-visit-date">Visit Date : ${escapeHtml(visitDateDisplay)}</div>
        </div>
      </div>
    </div>
    <div class="gims-divider"></div>
    <div class="opd-patient-section" style="margin:4px 0;">
      <div class="gims-patient-row">
        <div class="gims-patient-name">${escapeHtml(patientLine)}</div>
        <div class="gims-patient-uhid">CRN/UHID : ${uhidDisplay}</div>
      </div>
      <div class="gims-patient-details">
        ${[...detailLine1Parts, ...detailLine2Parts].map(seg => `<span style="white-space:nowrap">${seg}</span>`).join(' | ')} |
      </div>
    </div>
    ${smartParchaPages.length > 0 ? '' : '<div class="gims-top-spacer"></div>'}
    ${smartParchaHtml}`;

  const patientName = buildOpdSlipPatientNameLine({
    salutation: p.salutation, firstName: p.firstName, middleName: p.middleName,
    lastName: p.lastName, dateOfBirth: p.dateOfBirth, gender: p.gender, age: p.age
  });

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>OPD Slip - ${escapeHtml(patientName)}</title>
  <style>${REPORT_A4_PRINT_STYLES}${OPD_SLIP_STYLES}${GIMS_OPD_SLIP_STYLES}</style>
</head>
<body>
  <div class="report-print-root opd-slip-root">
    <div class="report-content">
      <div class="opd-slip gims-slip">
${bodyContent}
      </div>
    </div>
  </div>
</body>
</html>`;
}

export function renderOPDSlipHtml(payload: OPDSlipReportPayload): string {
  const gimsFacility =
    payload.useGimsLayout === true ||
    isGimsFacilityId(payload.facilityInfo?.facilityId ?? payload.layoutConfig?.facilityId);
  if (gimsFacility) return renderGimsOpdSlipHtml(payload);

  const {
    patientData: p,
    visitData: v,
    facilityInfo: f,
    doctorInfo,
    smartParchaPages = [],
    showDoctorSignature = false,
    smartParchaEnabled
  } = payload;
  const showOpdSlipBarcode = smartParchaEnabled !== false;
  const opdEmblemSanjivaniClass =
    isSanjivaniFacilityId(payload.facilityInfo?.facilityId ?? payload.layoutConfig?.facilityId)
      ? ' emblem-circle--sanjivani'
      : '';

  const config: PrintTemplateConfig = {
    reportTitle: 'OPD Slip',
    facilityName: f?.name ?? '',
    facilityId: '',
    facilityAddress: f?.address ?? '',
    facilityPhone: f?.phone ?? '',
    facilityEmail: f?.email ?? ''
  };

  const patientName = buildOpdSlipPatientNameLine({
    salutation: p.salutation,
    firstName: p.firstName,
    middleName: p.middleName,
    lastName: p.lastName,
    dateOfBirth: p.dateOfBirth,
    gender: p.gender,
    age: p.age
  });
  const validTill = visitIsFreeFollowUpForOpdSlip(v)
    ? formatOpdSlipFreeFollowUpValidTillDisplay(
        (v as { freeFollowUpValidTill?: string }).freeFollowUpValidTill
      )
    : formatOpdSlipFreeFollowUpValidTillDisplay(
        (v as { visitValidTill?: string }).visitValidTill
      );
  const roomNumber = (v.roomNumber != null && String(v.roomNumber).trim() !== '') ? String(v.roomNumber).trim() : 'NA';
  const doctorName = (v.doctor?.name || doctorInfo?.name || '').trim() || 'NA';
  const departmentName = (v.department?.name || '').trim() || 'NA';
  const tokenDisplay = v.tokenNumber != null ? String(v.tokenNumber) : 'N/A';
  const abhaNoDisplay = formatAbha(p.abhaNumber ?? v.abhaNumber).replace('N/A', 'NA');
  const abhaAddrDisplay = formatAbha(v.abhaAddress).replace('N/A', 'NA');
  /** Government slip: single token line (e.g. Fees : ₹1). Private: no fee row. */
  const feesTrimmed =
    v.fees != null && String(v.fees).trim() !== '' ? String(v.fees).trim() : '';
  const opdSlipFeeSegmentsForDisplay: string[] =
    feesTrimmed !== '' ? [`Fees : ${feesTrimmed}`] : [];
  const patientTypeDisplay = formatOpdSlipPatientType(v.priority);
  const barcodeHtml = buildOpdSlipBarcodeHtml(v.visitNumber || '', { showBarcode: showOpdSlipBarcode });
  const doctorQualification =
    (doctorInfo?.qualification ?? doctorInfo?.designation ?? doctorInfo?.position ?? v.doctor?.specialization ?? '').trim();
  const doctorRegistrationNumber = (doctorInfo?.regNumber ?? '').trim();
  const doctorSignature = showDoctorSignature ? (doctorInfo?.signature ?? '').trim() : '';
  const doctorNameDisplay =
    doctorName === 'NA'
      ? 'NA'
      : (/^dr\.?\s/i.test(doctorName) ? doctorName : `Dr. ${doctorName}`);
  const doctorSpecDisplay = departmentName !== 'NA' ? departmentName : (doctorQualification || 'General Physician');
  const patientNameShort = [p.firstName, p.middleName, p.lastName]
    .filter((part) => part != null && String(part).trim() !== '')
    .map((part) => String(part).trim())
    .join(' ') || patientName;
  const patientGender = (p.gender || '').trim() ? (p.gender || '').trim().charAt(0).toUpperCase() : '';
  const patientAge = formatOpdSlipAge(p.age, p.months, p.days);
  const patientMeta = [patientGender, patientAge !== '--' ? patientAge : ''].filter(Boolean).join(', ');
  const patientMetaSuffix = patientGender || patientAge !== '--' ? ` (${patientMeta})` : '';
  const patientLine = `${patientNameShort}${patientMetaSuffix}`;
  const mobileDisplay = (p.phoneNumber || '').trim() || 'NA';
  const dobDisplay = formatDateSafe(p.dateOfBirth || undefined);
  const visitDateDisplay = formatOpdSlipVisitDate(v.createdAt);
  const addressLine = (p.addressForDisplay || '').trim();
  const patientDetailSegmentsBeforeToken = [
    `UHID : ${escapeHtml(p.uhid || '--')}`,
    `ABHA No : ${escapeHtml(abhaNoDisplay)}`,
    `Patient Type : ${escapeHtml(patientTypeDisplay)}`,
    `DOB : ${escapeHtml(dobDisplay)}`,
    `ABHA Address : ${escapeHtml(abhaAddrDisplay)}`
  ];
  const patientDetailSegmentsAfterToken = [
    `Valid Till : ${escapeHtml(validTill)}`,
    ...opdSlipFeeSegmentsForDisplay.map((seg) => escapeHtml(seg))
  ];
  const tokenAddressHtml =
    addressLine !== ''
      ? `<span class="opd-patient-ids-item opd-patient-ids-item--token-address">Token : ${escapeHtml(tokenDisplay)} | Visit date : ${escapeHtml(visitDateDisplay)} | Address : ${escapeHtml(addressLine)}</span>`
      : `<span class="opd-patient-ids-item">Token : ${escapeHtml(tokenDisplay)} | Visit date : ${escapeHtml(visitDateDisplay)}</span>`;
  const opdPatientIdsHtml = [
    ...patientDetailSegmentsBeforeToken.map((seg) => `<span class="opd-patient-ids-item">${seg}</span>`),
    tokenAddressHtml,
    ...patientDetailSegmentsAfterToken.map((seg) => `<span class="opd-patient-ids-item">${seg}</span>`)
  ].join(' | ');
  const signatureOverlayHtml = showDoctorSignature && doctorSignature ? `
    <div class="opd-sig-overlay">
      <div class="opd-sig-overlay-content">
        ${doctorRegistrationNumber ? `<div class="opd-sig-reg">Reg No: ${escapeHtml(doctorRegistrationNumber)}</div>` : ''}
        <img src="${escapeHtml(doctorSignature)}" alt="Doctor Signature" class="opd-sig-image" />
        <div class="opd-sig-name">${escapeHtml(doctorNameDisplay !== 'NA' ? doctorNameDisplay : doctorName)}</div>
        ${departmentName !== 'NA' ? `<div class="opd-sig-dept">${escapeHtml(departmentName)}</div>` : ''}
      </div>
    </div>` : '';
  const smartParchaHtml = smartParchaPages.length > 0
    ? `
    <div class="notes-section">
      <div class="smart-parcha-pages">
        ${smartParchaPages.map((page, index) => {
          const isLast = index === smartParchaPages.length - 1;
          return `
          <div class="smart-parcha-page ${index === 0 ? 'first-page' : 'subsequent-page'}${isLast ? ' last-page' : ''}">
            <img src="${escapeHtml(page.content)}" alt="Smart Parcha Page ${page.pageNumber}" />
            ${isLast ? signatureOverlayHtml : ''}
          </div>`;
        }).join('')}
      </div>
    </div>`
    : '<div class="notes-section"></div>';

  const bodyContent = `
    <div class="opd-header">
      <div class="opd-logo-block">
        <div class="opd-logo-wrapper">
          <div class="emblem-circle${opdEmblemSanjivaniClass}">
            <img src="${escapeHtml(getReportLogoPublicUrl())}" alt="" class="emblem-image" />
          </div>
        </div>
      </div>
      <div class="opd-barcode-center">
        <div class="opd-barcode-wrap">${barcodeHtml}</div>
      </div>
      <div class="opd-doctor-block">
        <div class="opd-visit-id">Visit ID : ${escapeHtml(v.visitNumber || '--')}</div>
        <div class="opd-doctor-name">${escapeHtml(doctorNameDisplay)}</div>
        <div class="opd-doctor-spec">${escapeHtml(doctorSpecDisplay)}</div>
        ${doctorRegistrationNumber ? `<div class="opd-doctor-reg">Reg. No.: ${escapeHtml(doctorRegistrationNumber)}</div>` : ''}
        ${roomNumber !== 'NA' ? `<div class="opd-doctor-room">Room No.: ${escapeHtml(roomNumber)}</div>` : ''}
      </div>
    </div>
    <div class="opd-divider opd-divider--full-bleed"></div>
    <div class="opd-patient-section">
      <div class="opd-patient-row">
        <div class="opd-patient-name">${escapeHtml(patientLine)}</div>
        <div class="opd-patient-mobile">Mob : ${escapeHtml(mobileDisplay)}</div>
      </div>
      <div class="opd-patient-ids">${opdPatientIdsHtml}</div>
    </div>
    <div class="opd-divider opd-divider--inset"></div>
    ${smartParchaHtml}`;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>${escapeHtml(config.reportTitle)} - ${escapeHtml(patientName)}</title>
  <style>${REPORT_A4_PRINT_STYLES}${OPD_SLIP_STYLES}</style>
</head>
<body>
  <div class="report-print-root opd-slip-root">
    <div class="report-content">
      <div class="opd-slip">
${bodyContent}
      </div>
    </div>
  </div>
</body>
</html>`;
}

function opdBillingLineAmounts(row: OPDBillingLineItem, grossBillDiscountOnLine = 0): {
  gross: number;
  taxable: number;
  tax: number;
  lineTotal: number;
} {
  const qty = Number(row.quantity) || 0;
  const unit = Number(row.unitPrice) || 0;
  const lineDisc = Math.max(0, Number(row.discount) || 0);
  const billG = Math.max(0, Number(grossBillDiscountOnLine) || 0);
  const gstPct = Math.max(0, Number(row.gstPercent) || 0);
  const gross = qty * unit;
  const taxable = roundBillingRupee(Math.max(0, gross - lineDisc - billG));
  const tax = roundBillingRupee(taxable * (gstPct / 100));
  const lineTotal = roundBillingRupee(taxable + tax);
  return { gross, taxable, tax, lineTotal };
}

/**
 * Line discount as % of gross (qty × unit).
 * `billShareRupee` is this line’s share of bill-level discount (gross-charge split, same as registration grid).
 */
function formatOpdLineDiscountPercent(row: OPDBillingLineItem, billShareRupee = 0): string {
  const { gross } = opdBillingLineAmounts(row);
  const disc = Math.max(0, Number(row.discount) || 0) + Math.max(0, billShareRupee);
  if (disc <= 0) return '0%';
  if (gross <= 0) return '—';
  const pct = (disc / gross) * 100;
  return `${pct.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%`;
}

/** Bill-level discount % as entered/stored (receipt Disc. % column when not derived per line). */
function formatBillDiscountPercentEntered(pct: number): string {
  const x = Math.max(0, Math.min(100, Number(pct) || 0));
  return `${x.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}%`;
}

/** Stored tax rate 0–100 for display in the receipt table Tax % column. */
function formatGstPercentCell(gstPercent: unknown): string {
  const p = Math.max(0, Number(gstPercent) || 0);
  return `${p.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%`;
}

const OP_BILLING_EXTRA_STYLES = `
/* ~95% usable width on A4; keep in sync with OPD_BILLING_CONTENT_HPAD_MM in printUtils.ts */
.report-print-root.opd-billing-root .report-content {
  max-width: 210mm;
  width: 100%;
  box-sizing: border-box;
  padding-left: 5.25mm !important;
  padding-right: 5.25mm !important;
}
.report-print-root.opd-billing-root .content-wrapper {
  width: 100%;
  max-width: none;
  box-sizing: border-box;
}
.opd-receipt { font-size: 11px; color: #1a202c; line-height: 1.45; width: 100%; box-sizing: border-box; }
.opd-receipt-title-wrap { text-align: center; margin: 2px 0 6px; }
.opd-receipt-title {
  margin: 0;
  padding: 0;
  font-size: 15px;
  font-weight: 700;
  line-height: 1.2;
  color: #1a202c;
  letter-spacing: 0.02em;
}
.opd-receipt-patient-box {
  width: 100%;
  box-sizing: border-box;
  border-top: 1px solid #1a202c;
  border-bottom: 1px solid #1a202c;
  padding: 8px 12px;
  margin-bottom: 12px;
  background-color: #f4f7fb;
  -webkit-print-color-adjust: exact;
  print-color-adjust: exact;
}
.opd-receipt-patient-grid { display: table; width: 100%; table-layout: fixed; margin: 0; }
.opd-receipt-col { display: table-cell; vertical-align: top; box-sizing: border-box; }
.opd-receipt-col-patient { width: 62%; padding-right: 20px; }
.opd-receipt-col-bill { width: 38%; padding-left: 4px; padding-right: 0; }
/* Label | : | value — fixed label width so colons align; value wraps under itself (not under label). */
.opd-receipt-patient-box .opd-receipt-kv-row {
  display: grid;
  align-items: start;
  margin-bottom: 3px;
  font-size: 11px;
  line-height: 1.35;
  color: #1a202c;
}
.opd-receipt-patient-box .opd-receipt-kv-row:last-child { margin-bottom: 0; }
.opd-receipt-col-patient .opd-receipt-kv-row {
  grid-template-columns: 6.5rem 0.5rem minmax(0, 1fr);
  column-gap: 3px;
}
.opd-receipt-col-bill .opd-receipt-kv-row {
  grid-template-columns: 7.25rem 0.5rem minmax(0, 1fr);
  column-gap: 3px;
}
.opd-receipt-patient-box .opd-receipt-k {
  font-weight: 700;
  text-align: left;
  white-space: nowrap;
}
.opd-receipt-patient-box .opd-receipt-c {
  font-weight: 700;
  text-align: left;
  justify-self: start;
}
.opd-receipt-patient-box .opd-receipt-v {
  font-weight: 400;
  min-width: 0;
  word-wrap: break-word;
  overflow-wrap: break-word;
}
.opd-receipt-section-heading { font-weight: 700; font-size: 12px; margin: 16px 0 8px; color: #1a202c; }
.opd-receipt .opd-receipt-services-heading {
  margin-top: 22px;
  margin-bottom: 8px;
}
.opd-receipt-table-wrap { width: 100%; margin-bottom: 4px; }
.opd-receipt-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 10px;
  margin: 0 0 6px;
  table-layout: fixed;
  border: none;
}
.opd-receipt-table thead th {
  background-color: #f8f9fa;
  color: #2d3748;
  padding: 5px 3px;
  vertical-align: middle;
  font-size: 9.5px;
  font-weight: bold !important;
  line-height: 1.15;
  white-space: nowrap;
  word-break: keep-all;
  overflow-wrap: normal;
  border: none;
  border-bottom: 1px solid #dee2e6;
  -webkit-print-color-adjust: exact;
  print-color-adjust: exact;
}
.opd-receipt-table tbody td {
  background: #fff;
  color: #2d3748;
  border: none;
  border-bottom: 1px solid #e9ecef;
  padding: 6px 3px;
  vertical-align: middle;
}
/* Multi-line service + subtitle: keep block top-aligned; other columns stay vertically centered in the row. */
.opd-receipt-table tbody td.opd-receipt-service {
  vertical-align: top;
}
.opd-receipt-table tbody tr:last-child td {
  border-bottom: 1px solid #dee2e6;
}
.opd-receipt-table thead .opd-receipt-th-num { text-align: right; }
.opd-receipt-table thead .opd-receipt-th-sn {
  text-align: left;
}
.opd-receipt-table thead .opd-receipt-th-service { text-align: left; }
.opd-receipt-table tbody td.opd-receipt-td-sn {
  text-align: left;
  white-space: nowrap;
  word-break: keep-all;
}
.opd-receipt-table .opd-receipt-service { text-align: left !important; }
.opd-receipt-table .opd-receipt-num {
  text-align: right !important;
  white-space: nowrap;
  word-break: keep-all;
  overflow-wrap: normal;
}
.opd-receipt-service-name { font-weight: 600; color: #2d3748; }
.opd-receipt-service-detail { font-size: 9px; color: #6c757d; margin-top: 4px; line-height: 1.35; }
/* Totals: right half of content, labels + amounts right-aligned (reference layout). */
.opd-receipt-summary-wrap {
  width: 50%;
  max-width: 50%;
  margin-left: auto;
  margin-right: 0;
  margin-top: 0;
  margin-bottom: 0;
  box-sizing: border-box;
  padding-left: 8px;
}
.opd-receipt-summary-table {
  width: 100%;
  border-collapse: collapse;
  table-layout: fixed;
  font-size: 11px;
  line-height: 1.35;
  margin-top: 0;
  margin-bottom: 0;
  box-sizing: border-box;
}
.opd-receipt-summary-table td {
  padding: 3px 0;
  vertical-align: baseline;
  border: none;
}
.opd-receipt-summary-table .opd-receipt-summary-label {
  text-align: right;
  font-weight: 700;
  color: #1a202c;
  white-space: nowrap;
  width: 58%;
  padding-right: 10px;
  box-sizing: border-box;
}
.opd-receipt-summary-table .opd-receipt-summary-amt {
  text-align: right;
  width: 42%;
  white-space: nowrap;
  font-variant-numeric: tabular-nums;
  font-weight: 400;
  color: #1a202c;
  padding-left: 4px;
  box-sizing: border-box;
}
.opd-receipt-summary-table tr.opd-receipt-summary-balance td {
  border-top: 1px solid #1a202c;
  padding-top: 6px;
  font-weight: 700;
  font-size: 12px;
}
.opd-receipt-summary-table tr.opd-receipt-summary-balance .opd-receipt-summary-amt {
  font-weight: 700;
  border-bottom: 1px solid #1a202c;
  padding-bottom: 3px;
}
.opd-receipt-summary-table tr.opd-receipt-summary-balance .opd-receipt-summary-label {
  border-bottom: 1px solid #1a202c;
  padding-bottom: 3px;
}
.opd-receipt-payment {
  margin-top: 10px;
  width: 100%;
  max-width: 100%;
  text-align: left;
  box-sizing: border-box;
}
.opd-receipt-payment .opd-receipt-section-heading { margin-top: 0; margin-bottom: 5px; }
.opd-receipt-payment .opd-receipt-kv-row {
  display: grid;
  align-items: start;
  margin-bottom: 4px;
  font-size: 11px;
  line-height: 1.4;
  color: #1a202c;
  grid-template-columns: 8.75rem 0.5rem minmax(0, 1fr);
  column-gap: 3px;
}
.opd-receipt-payment .opd-receipt-kv-row:last-child { margin-bottom: 0; }
.opd-receipt-payment .opd-receipt-k {
  font-weight: 700;
  text-align: left;
  white-space: nowrap;
}
.opd-receipt-payment .opd-receipt-c { font-weight: 700; }
.opd-receipt-payment .opd-receipt-v {
  font-weight: 400;
  min-width: 0;
  word-wrap: break-word;
  overflow-wrap: break-word;
}
.opd-receipt-payment .opd-receipt-kv-row.opd-receipt-kv-strong .opd-receipt-k,
.opd-receipt-payment .opd-receipt-kv-row.opd-receipt-kv-strong .opd-receipt-c,
.opd-receipt-payment .opd-receipt-kv-row.opd-receipt-kv-strong .opd-receipt-v {
  font-weight: 700;
}

/* Print / PDF: professional page breaks (multi-page line lists, repeating table header). */
@media print {
  .report-print-root.opd-billing-root .opd-receipt-title-wrap {
    page-break-after: avoid;
    break-after: avoid;
  }
  .report-print-root.opd-billing-root .opd-receipt-patient-box {
    page-break-inside: avoid;
    break-inside: avoid;
  }
  .report-print-root.opd-billing-root .opd-receipt-services-heading {
    page-break-after: avoid;
    break-after: avoid;
  }
  .report-print-root.opd-billing-root .opd-receipt-table-wrap {
    page-break-inside: auto;
    break-inside: auto;
  }
  .report-print-root.opd-billing-root .opd-receipt-table {
    page-break-inside: auto;
    break-inside: auto;
  }
  .report-print-root.opd-billing-root .opd-receipt-table thead {
    display: table-header-group;
  }
  .report-print-root.opd-billing-root .opd-receipt-table tbody {
    display: table-row-group;
  }
  .report-print-root.opd-billing-root .opd-receipt-table thead tr {
    page-break-after: avoid;
    break-after: avoid;
  }
  .report-print-root.opd-billing-root .opd-receipt-table tbody tr {
    page-break-inside: avoid;
    break-inside: avoid;
  }
  .report-print-root.opd-billing-root .opd-receipt-table th,
  .report-print-root.opd-billing-root .opd-receipt-table td {
    page-break-inside: avoid;
    break-inside: avoid;
  }
  /* Totals + payment: keep on one chunk so balances are not orphaned from payment lines. */
  .report-print-root.opd-billing-root .opd-receipt-closing {
    page-break-inside: avoid;
    break-inside: avoid;
  }
}
`;

/**
 * OPD Billing / OPD Receipt body: facility header + receipt content + facility footer (no signatory).
 */
export function renderOPBillingHtml(payload: OPDBillingReportPayload): string {
  const {
    layoutConfig,
    patientInfo,
    receiptPatient: rpIn,
    billNumber,
    dateOfIssue,
    receiptTitle,
    lineItems,
    summary,
    payment,
    billLevelDiscount: billLevelDiscountRaw,
    billingDiscountPercent: billingDiscountPercentRaw
  } = payload;
  const billLevelDisc = roundBillingRupee(Math.max(0, Number(billLevelDiscountRaw) || 0));
  const billDiscountRupeePerLine = opdBillLevelDiscountGrossRupeePerLine(lineItems, billLevelDisc);
  const billDiscPctEntered =
    billingDiscountPercentRaw != null && Number.isFinite(Number(billingDiscountPercentRaw))
      ? formatBillDiscountPercentEntered(Number(billingDiscountPercentRaw))
      : null;
  const reportHeaderHtml = buildReportHeaderHtml(layoutConfig, getReportLogoPublicUrl());
  const reportFooterHtml = buildReportFooterHtml(layoutConfig);

  const rp = rpIn ?? {
    nameLine: patientInfo.name,
    phone: patientInfo.phone,
    email: '—',
    address: patientInfo.address
  };

  const titleText = (receiptTitle || 'OPD Receipt').trim();

  const rows =
    lineItems.length > 0
      ? lineItems
          .map((row, i) => {
            const billShareRs = billDiscountRupeePerLine[i] ?? 0;
            const { taxable, tax, lineTotal } = opdBillingLineAmounts(row, billShareRs);
            const lineDiscRs = Math.max(0, Number(row.discount) || 0);
            const discountColRs = roundBillingRupee(lineDiscRs + billShareRs);
            const sub = row.serviceDetail?.trim()
              ? `<div class="opd-receipt-service-detail">${escapeHtml(row.serviceDetail)}</div>`
              : '';
            return `<tr>
              <td class="opd-receipt-td-sn">${i + 1}</td>
              <td class="opd-receipt-service"><div class="opd-receipt-service-name">${escapeHtml(row.serviceName)}</div>${sub}</td>
              <td class="opd-receipt-num">${escapeHtml(String(Number(row.quantity) || 0))}</td>
              <td class="opd-receipt-num">${escapeHtml(formatReceiptRs(Number(row.unitPrice) || 0))}</td>
              <td class="opd-receipt-num">${escapeHtml(
                billDiscPctEntered ?? formatOpdLineDiscountPercent(row, billShareRs)
              )}</td>
              <td class="opd-receipt-num">${escapeHtml(formatReceiptRs(discountColRs))}</td>
              <td class="opd-receipt-num">${escapeHtml(formatReceiptRs(taxable))}</td>
              <td class="opd-receipt-num">${escapeHtml(formatGstPercentCell(row.gstPercent))}</td>
              <td class="opd-receipt-num">${escapeHtml(formatReceiptRs(tax))}</td>
              <td class="opd-receipt-num">${escapeHtml(formatReceiptRs(lineTotal))}</td>
            </tr>`;
          })
          .join('')
      : `<tr><td colspan="10" style="text-align:center;padding:16px;color:#666;">No line items</td></tr>`;

  const tableHtml = `<div class="opd-receipt-table-wrap">
  <table class="opd-receipt-table">
    <thead><tr>
      <th class="opd-receipt-th-sn" style="width:5%">Sr. No.</th>
      <th class="opd-receipt-th-service" style="width:24%">Service Name</th>
      <th class="opd-receipt-th-num" style="width:5%">QTY.</th>
      <th class="opd-receipt-th-num" style="width:8%">Unit Price</th>
      <th class="opd-receipt-th-num" style="width:6%">Disc. %</th>
      <th class="opd-receipt-th-num" style="width:7%">Discount</th>
      <th class="opd-receipt-th-num" style="width:8%">Subtotal</th>
      <th class="opd-receipt-th-num" style="width:5%">Tax %</th>
      <th class="opd-receipt-th-num" style="width:8%">Tax Amt</th>
      <th class="opd-receipt-th-num" style="width:9%">Total</th>
    </tr></thead>
    <tbody>${rows}</tbody>
  </table>
  </div>`;

  const summaryHtml = `
    <div class="opd-receipt-summary-wrap">
    <table class="opd-receipt-summary-table" role="presentation">
      <tbody>
        <tr><td class="opd-receipt-summary-label">Subtotal</td><td class="opd-receipt-summary-amt">${escapeHtml(formatReceiptRs(summary.subtotal))}</td></tr>
        <tr><td class="opd-receipt-summary-label">Discount</td><td class="opd-receipt-summary-amt">${escapeHtml(formatReceiptRs(roundBillingRupee((summary.itemWiseDiscount ?? 0) + (summary.billLevelDiscount ?? 0))))}</td></tr>
        <tr><td class="opd-receipt-summary-label">Tax Amount</td><td class="opd-receipt-summary-amt">${escapeHtml(formatReceiptRs(summary.taxAmount))}</td></tr>
        <tr><td class="opd-receipt-summary-label">Final Amount</td><td class="opd-receipt-summary-amt">${escapeHtml(formatReceiptRs(summary.finalAmount))}</td></tr>
        <tr><td class="opd-receipt-summary-label">Total Amount Received</td><td class="opd-receipt-summary-amt">${escapeHtml(formatReceiptRs(summary.receivedAmount))}</td></tr>
      </tbody>
    </table>
    </div>`;

  const paymentHtml = `
    <div class="opd-receipt-payment">
      <div class="opd-receipt-section-heading">Payment Information:</div>
      <div class="opd-receipt-kv-row"><span class="opd-receipt-k">Payment Methods</span><span class="opd-receipt-c">:</span><span class="opd-receipt-v">${escapeHtml(payment.methods || '—')}</span></div>
      <div class="opd-receipt-kv-row"><span class="opd-receipt-k">Amount Paid</span><span class="opd-receipt-c">:</span><span class="opd-receipt-v">${escapeHtml(formatReceiptRs(payment.amountPaid))}</span></div>
    </div>`;

  const patientBlock = `
    <div class="opd-receipt-patient-box">
      <div class="opd-receipt-patient-grid">
        <div class="opd-receipt-col opd-receipt-col-patient">
          <div class="opd-receipt-kv-row"><span class="opd-receipt-k">Name</span><span class="opd-receipt-c">:</span><span class="opd-receipt-v">${escapeHtml(rp.nameLine)}</span></div>
          <div class="opd-receipt-kv-row"><span class="opd-receipt-k">Phone</span><span class="opd-receipt-c">:</span><span class="opd-receipt-v">${escapeHtml(rp.phone || '—')}</span></div>
          <div class="opd-receipt-kv-row"><span class="opd-receipt-k">Address</span><span class="opd-receipt-c">:</span><span class="opd-receipt-v">${escapeHtml(formatAddressForDisplay(rp.address))}</span></div>
        </div>
        <div class="opd-receipt-col opd-receipt-col-bill">
          <div class="opd-receipt-kv-row"><span class="opd-receipt-k">Bill Number</span><span class="opd-receipt-c">:</span><span class="opd-receipt-v">${escapeHtml(billNumber || '—')}</span></div>
          <div class="opd-receipt-kv-row"><span class="opd-receipt-k">Date of Issue</span><span class="opd-receipt-c">:</span><span class="opd-receipt-v">${escapeHtml(dateOfIssue || '—')}</span></div>
        </div>
      </div>
    </div>`;

  const bodyContent = `
    <div class="opd-receipt">
      <div class="opd-receipt-title-wrap">
        <h2 class="opd-receipt-title">${escapeHtml(titleText)}</h2>
      </div>
      ${patientBlock}
      <div class="opd-receipt-section-heading opd-receipt-services-heading">Medical Services and Charges:</div>
      ${tableHtml}
      <div class="opd-receipt-closing">
      ${summaryHtml}
      ${paymentHtml}
      </div>
    </div>`;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>${escapeHtml(layoutConfig.reportTitle)} - ${escapeHtml(patientInfo.name)}</title>
  <style>${REPORT_A4_PRINT_STYLES}${OP_BILLING_EXTRA_STYLES}</style>
</head>
<body>
  <div class="report-print-root opd-billing-root">
    <div class="report-content">
${reportHeaderHtml}
      <div class="content-wrapper">
${bodyContent}
      </div>
    </div>
    ${reportFooterHtml}
  </div>
</body>
</html>`;
}
