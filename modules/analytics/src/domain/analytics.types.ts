export const ANALYTICS_MODULE_KEY = "analytics" as const;

export type AnalyticsModuleStatus = {
  status: "ok";
  module: typeof ANALYTICS_MODULE_KEY;
};

export type ReportSnapshot = {
  id: string;
  iq_tenant_id: string;
  report_key: string;
  generated_at: string;
  payload: Record<string, unknown>;
  created_at: string;
  updated_at: string;
  created_by: string | null;
  updated_by: string | null;
};
