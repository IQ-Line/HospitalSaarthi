export { createRouter } from "./router.js";
export type { AnalyticsRouterOptions } from "./router.js";

export {
  ANALYTICS_MODULE_KEY,
  type AnalyticsModuleStatus,
  type ReportSnapshot,
} from "./domain/analytics.types.js";

export type {
  OpdRegistrationBillingReportPage,
  OpdRegistrationBillingReportQuery,
  OpdRegistrationBillingReportRow,
  OpdRegistrationBillingReportSummary,
  RegistrationSourceFilter,
} from "./domain/opd-registration-billing-report.types.js";

export type { ReportSnapshotRepo, OpdRegistrationBillingReportRepo } from "./ports.js";

export {
  analyticsSchema,
  reportSnapshots,
  ANALYTICS_SCHEMA_NAME,
} from "./schema/tables.js";

export { applyAnalyticsSchemaMigration } from "./schema/apply-migration.js";

export { registerStatusHandler } from "./rest-handlers/status.handler.js";
export { registerOpdRegistrationBillingReportHandler } from "./rest-handlers/opd-registration-billing-report.handler.js";
export { DrizzleOpdRegistrationBillingReportRepo } from "./data-access/opd-registration-billing-report.repo.js";
export { OPD_REGISTRATION_BILLING_COLUMNS } from "./lib/build-opd-registration-billing-workbook.js";
