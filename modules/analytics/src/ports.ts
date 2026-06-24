import type { ReportSnapshot } from "./domain/analytics.types.js";
import type {
  OpdRegistrationBillingReportPage,
  OpdRegistrationBillingReportQuery,
  OpdRegistrationBillingReportRow,
  OpdRegistrationBillingReportSummary,
} from "./domain/opd-registration-billing-report.types.js";

export interface ReportSnapshotRepo {
  findLatestByKey(
    tenantId: string,
    reportKey: string,
  ): Promise<ReportSnapshot | undefined>;
}

export interface OpdRegistrationBillingReportRepo {
  getReportPage(
    tenantId: string,
    query: OpdRegistrationBillingReportQuery,
  ): Promise<OpdRegistrationBillingReportPage>;
  listAllRows(
    tenantId: string,
    query: Omit<OpdRegistrationBillingReportQuery, "page" | "limit">,
  ): Promise<{ summary: OpdRegistrationBillingReportSummary; data: OpdRegistrationBillingReportRow[] }>;
}
