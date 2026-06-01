export {
  renderOPDSlipHtml,
  renderOPBillingHtml,
  buildReportHeaderHtml,
  buildReportFooterHtml,
  setDefaultReportLogoUrl,
} from "./opd-templates.generated.js";
export { setReportWebOrigin, resolveReportLogoUrl } from "./logo.js";
export { DEFAULT_REPORT_LOGO_DATA_URL } from "./default-report-logo.js";
export { computeOPDBillingSummary, opdBillLevelDiscountGrossRupeePerLine } from "./billing-math.js";
export { buildOpdSlipPatientNameLine } from "./formatters.js";
export type {
  OPDSlipReportPayload,
  OPDBillingReportPayload,
  OPDBillingLineItem,
  PrintTemplateConfig,
  ReportLayoutConfigResult,
  PatientInfo,
} from "./types.js";
