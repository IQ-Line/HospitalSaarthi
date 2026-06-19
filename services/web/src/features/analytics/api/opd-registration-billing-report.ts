import type { ApiClientContext } from '@/lib/api-client-context';
import { apiClient, apiClientBlob } from '@/lib/api-client';
import type {
  OpdRegistrationBillingReportFilters,
  OpdRegistrationBillingReportPage,
  RegistrationSourceFilter,
} from '../types';

const ANALYTICS_API_PREFIX = '/api/analytics/v1';

function buildReportQuery(
  filters: OpdRegistrationBillingReportFilters,
  page?: number,
  limit?: number,
): string {
  const params = new URLSearchParams({
    from_date: filters.fromDate,
    to_date: filters.toDate,
    registration_source: filters.registrationSource,
  });
  if (page != null) {
    params.set('page', String(page));
  }
  if (limit != null) {
    params.set('limit', String(limit));
  }
  return `${ANALYTICS_API_PREFIX}/reports/opd-registration-billing?${params.toString()}`;
}

export async function fetchOpdRegistrationBillingReport(
  filters: OpdRegistrationBillingReportFilters,
  page: number,
  limit: number,
  context?: ApiClientContext,
): Promise<OpdRegistrationBillingReportPage> {
  return apiClient<OpdRegistrationBillingReportPage>(
    buildReportQuery(filters, page, limit),
    {},
    context,
  );
}

export async function downloadOpdRegistrationBillingReportExcel(
  filters: OpdRegistrationBillingReportFilters,
  context?: ApiClientContext,
): Promise<Blob> {
  const params = new URLSearchParams({
    from_date: filters.fromDate,
    to_date: filters.toDate,
    registration_source: filters.registrationSource,
  });
  return apiClientBlob(
    `${ANALYTICS_API_PREFIX}/reports/opd-registration-billing/export?${params.toString()}`,
    {},
    context,
  );
}

export function defaultReportDateRange(): Pick<
  OpdRegistrationBillingReportFilters,
  'fromDate' | 'toDate'
> {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  const toIso = (d: Date) => d.toISOString().slice(0, 10);
  return {
    fromDate: toIso(start),
    toDate: toIso(now),
  };
}

export function isRegistrationSourceFilter(value: string): value is RegistrationSourceFilter {
  return value === 'all' || value === 'abha' || value === 'manual';
}
