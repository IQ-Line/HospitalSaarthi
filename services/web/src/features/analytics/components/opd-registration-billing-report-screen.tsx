import { useMemo, useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import { resolvePlatformSuperAdmin } from '@/lib/platform-admin';
import { useAuthStore } from '@/stores/auth.store';
import { usePermissionsStore } from '@/stores/permissions.store';
import { useTenantStore } from '@/stores/tenant.store';
import { resolveDefaultFacilityTenantId } from '@/features/dashboard/api/facilities';
import { useDashboardFacilities } from '@/features/dashboard/hooks/use-dashboard-facilities';
import {
  defaultReportDateRange,
  downloadOpdRegistrationBillingReportExcel,
  fetchOpdRegistrationBillingReport,
} from '../api/opd-registration-billing-report';
import { analyticsQueryKeys } from '../api/query-keys';
import { OpdRegistrationBillingReportPageView } from './opd-registration-billing-report-page';
import {
  OPD_REGISTRATION_BILLING_PAGE_SIZE,
  type OpdRegistrationBillingReportFilters,
} from '../types';

export function OpdRegistrationBillingReportScreen() {
  const accessToken = useAuthStore((s) => s.accessToken);
  const authRoles = useAuthStore((s) => s.roles);
  const principalRoles = usePermissionsStore((s) => s.roles);
  const homeTenantId = useTenantStore((s) => s.homeTenantId);
  const activeTenantId = useTenantStore((s) => s.tenantId);

  const isSuperAdmin = resolvePlatformSuperAdmin({
    accessToken,
    authRoles,
    principalRoles,
  });

  const facilitiesQuery = useDashboardFacilities(isSuperAdmin);
  const facilities = facilitiesQuery.data ?? [];

  const defaultRange = useMemo(() => defaultReportDateRange(), []);

  const [facilityTenantOverride, setFacilityTenantOverride] = useState<string | undefined>(
    undefined,
  );
  const [draftFilters, setDraftFilters] = useState<OpdRegistrationBillingReportFilters>({
    ...defaultRange,
    registrationSource: 'all',
  });
  const [appliedFilters, setAppliedFilters] = useState<OpdRegistrationBillingReportFilters | null>(
    null,
  );
  const [page, setPage] = useState(1);

  const effectiveTenantId = useMemo(() => {
    if (!isSuperAdmin) {
      return activeTenantId ?? homeTenantId ?? undefined;
    }

    const pick = (id: string | null | undefined) =>
      id && facilities.some((f) => f.tenantId === id) ? id : null;

    return (
      pick(facilityTenantOverride) ??
      pick(activeTenantId) ??
      resolveDefaultFacilityTenantId(facilities, homeTenantId) ??
      undefined
    );
  }, [activeTenantId, facilityTenantOverride, facilities, homeTenantId, isSuperAdmin]);

  const reportApiContext = isSuperAdmin && effectiveTenantId
    ? { tenantIdOverride: effectiveTenantId }
    : undefined;

  const reportQuery = useQuery({
    queryKey: analyticsQueryKeys.opdRegistrationBilling(
      effectiveTenantId ?? '',
      {
        fromDate: appliedFilters?.fromDate ?? '',
        toDate: appliedFilters?.toDate ?? '',
        registrationSource: appliedFilters?.registrationSource ?? 'all',
        page,
        limit: OPD_REGISTRATION_BILLING_PAGE_SIZE,
      },
    ),
    queryFn: () =>
      fetchOpdRegistrationBillingReport(
        appliedFilters!,
        page,
        OPD_REGISTRATION_BILLING_PAGE_SIZE,
        reportApiContext,
      ),
    enabled: Boolean(effectiveTenantId && appliedFilters),
  });

  const downloadMutation = useMutation({
    mutationFn: async () => {
      if (!effectiveTenantId || !appliedFilters) {
        throw new Error('Load a report before downloading.');
      }
      return downloadOpdRegistrationBillingReportExcel(appliedFilters, reportApiContext);
    },
    onSuccess: (blob) => {
      if (!appliedFilters) return;
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = `opd-registration-billing-${appliedFilters.fromDate}-to-${appliedFilters.toDate}.xlsx`;
      anchor.click();
      URL.revokeObjectURL(url);
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : 'Failed to download Excel');
    },
  });

  const handleLoadReport = () => {
    if (!effectiveTenantId) {
      toast.error(isSuperAdmin ? 'Select a facility first.' : 'Tenant context is unavailable.');
      return;
    }
    if (!draftFilters.fromDate || !draftFilters.toDate) {
      toast.error('From date and to date are required.');
      return;
    }
    if (draftFilters.fromDate > draftFilters.toDate) {
      toast.error('From date must be on or before to date.');
      return;
    }
    setPage(1);
    setAppliedFilters({ ...draftFilters });
  };

  return (
    <OpdRegistrationBillingReportPageView
      showFacilitySwitcher={isSuperAdmin}
      facilityTenantId={effectiveTenantId}
      homeTenantId={homeTenantId}
      onFacilityChange={setFacilityTenantOverride}
      draftFilters={draftFilters}
      onDraftFiltersChange={(patch) => setDraftFilters((current) => ({ ...current, ...patch }))}
      onLoadReport={handleLoadReport}
      onDownloadExcel={() => downloadMutation.mutate()}
      page={page}
      onPageChange={setPage}
      report={reportQuery.data}
      isLoading={reportQuery.isLoading}
      isFetching={reportQuery.isFetching}
      isDownloading={downloadMutation.isPending}
      hasLoadedReport={Boolean(reportQuery.data)}
      errorMessage={
        reportQuery.error instanceof Error ? reportQuery.error.message : null
      }
    />
  );
}
