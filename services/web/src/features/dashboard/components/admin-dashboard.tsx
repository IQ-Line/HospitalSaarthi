import { useMemo, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { Button } from '@pulse/ui/button';
import { isPlatformSuperAdminFromAccessToken } from '@/lib/platform-admin';
import { useAuthStore } from '@/stores/auth.store';
import { useTenantStore } from '@/stores/tenant.store';
import { isDashboardDataUnavailableError } from '../api/errors';
import { resolveDefaultFacilityTenantId } from '../api/facilities';
import { useDashboardFacilities } from '../hooks/use-dashboard-facilities';
import { useDashboardMetrics } from '../hooks/use-dashboard-metrics';
import { FacilitySwitcher } from './facility-switcher';
import { PatientFootfallChart } from './patient-footfall-chart';
import { StatCard } from './stat-card';
import { TodaysVisitsTable } from './todays-visits-table';
import { TopItemsPanel } from './top-items-panel';

export function AdminDashboard() {
  const accessToken = useAuthStore((s) => s.accessToken);
  const homeTenantId = useTenantStore((s) => s.homeTenantId);
  const activeTenantId = useTenantStore((s) => s.tenantId);

  const isSuperAdmin = isPlatformSuperAdminFromAccessToken(accessToken);
  const facilitiesQuery = useDashboardFacilities(isSuperAdmin);
  const facilities = facilitiesQuery.data ?? [];

  const [dashboardTenantOverride, setDashboardTenantOverride] = useState<string | undefined>(
    undefined,
  );

  const effectiveTenantId = useMemo(() => {
    const pick = (id: string | null | undefined) =>
      id && facilities.some((f) => f.tenantId === id) ? id : null;

    if (!isSuperAdmin) {
      return activeTenantId ?? homeTenantId ?? null;
    }
    return (
      pick(dashboardTenantOverride) ??
      pick(activeTenantId) ??
      resolveDefaultFacilityTenantId(facilities, homeTenantId) ??
      null
    );
  }, [activeTenantId, dashboardTenantOverride, facilities, homeTenantId, isSuperAdmin]);

  const metricsQuery = useDashboardMetrics(effectiveTenantId ?? null);
  const bundle = metricsQuery.data;
  const isInitialLoad = metricsQuery.isLoading && !metricsQuery.data;

  return (
    <div className="p-4 md:p-6" data-testid="admin-dashboard">
      {isSuperAdmin ? (
        <div className="mb-6 flex flex-col items-end gap-3">
          {facilitiesQuery.isError ? (
            <div
              className="w-full max-w-sm rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive"
              data-testid="dashboard-facilities-error"
            >
              {facilitiesQuery.error instanceof Error
                ? facilitiesQuery.error.message
                : 'Failed to load facilities'}
            </div>
          ) : (
            <div className="flex flex-wrap items-start justify-end gap-3">
              <FacilitySwitcher
                selectedTenantId={effectiveTenantId ?? undefined}
                homeTenantId={homeTenantId}
                onChange={setDashboardTenantOverride}
              />
              {metricsQuery.isFetching && !isInitialLoad ? (
                <Loader2
                  className="mt-8 size-4 shrink-0 animate-spin text-muted-foreground"
                  aria-hidden
                />
              ) : null}
            </div>
          )}
        </div>
      ) : null}

      {isInitialLoad ? (
        <div className="flex min-h-[400px] items-center justify-center text-muted-foreground">
          Loading dashboard…
        </div>
      ) : null}

      {metricsQuery.isError && !isInitialLoad ? (
        <div
          className="rounded-lg border border-destructive/30 bg-destructive/5 p-4"
          data-testid="dashboard-metrics-error"
        >
          <p className="text-destructive">
            {isDashboardDataUnavailableError(metricsQuery.error)
              ? metricsQuery.error.message
              : metricsQuery.error instanceof Error
                ? metricsQuery.error.message
                : 'Error loading dashboard data'}
          </p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="mt-3"
            onClick={() => void metricsQuery.refetch()}
          >
            Retry
          </Button>
        </div>
      ) : null}

      {bundle && !metricsQuery.isError ? (
        <>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard label="Total Visits" value={bundle.stats.totalVisits} />
            <StatCard label="New Patient Registrations" value={bundle.stats.newPatientRegistrations} />
            <StatCard
              label="Follow Up Patient Registrations"
              value={bundle.stats.followUpPatientRegistrations}
            />
            <StatCard
              label="Doctor Pending Consultations"
              value={bundle.stats.doctorPendingConsultations}
            />
          </div>

          <div className="mt-6 grid gap-6 lg:grid-cols-2">
            <PatientFootfallChart data={bundle.footfall} />
            <TodaysVisitsTable visits={bundle.todaysVisits} />
          </div>

          {bundle.topItems ? (
            <div className="mt-8">
              <TopItemsPanel
                medicines={bundle.topItems.medicines}
                diagnoses={bundle.topItems.diagnoses}
                diagnostics={bundle.topItems.diagnostics}
              />
            </div>
          ) : null}
        </>
      ) : null}
    </div>
  );
}
