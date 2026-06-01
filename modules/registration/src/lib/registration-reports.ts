import {
  renderOPBillingHtml,
  renderOPDSlipHtml,
  setDefaultReportLogoUrl,
  setReportWebOrigin,
} from "@hims/registration-reports";
import type { ReportDocumentContext } from "../lib/report-document-context.js";

export function configureRegistrationReports(context?: ReportDocumentContext): void {
  if (context?.webOrigin?.trim()) {
    setReportWebOrigin(context.webOrigin.trim());
  }
  if (context?.logoUrl?.trim()) {
    setDefaultReportLogoUrl(context.logoUrl.trim());
  }
}

export function renderOpdSlipDocumentHtml(
  payload: Parameters<typeof renderOPDSlipHtml>[0],
  context?: ReportDocumentContext,
): string {
  configureRegistrationReports(context);
  return renderOPDSlipHtml(payload);
}

export function renderOpdReceiptDocumentHtml(
  payload: Parameters<typeof renderOPBillingHtml>[0],
  context?: ReportDocumentContext,
): string {
  configureRegistrationReports(context);
  return renderOPBillingHtml(payload);
}
