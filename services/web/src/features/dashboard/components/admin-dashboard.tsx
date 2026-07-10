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
import type { DashboardMetricsBundle } from '../types';
import { FacilitySwitcher } from './facility-switcher';
import { PatientFootfallChart } from './patient-footfall-chart';
import { StatCard } from './stat-card';
import { TodaysVisitsTable } from './todays-visits-table';
import { TopItemsPanel } from './top-items-panel';

interface SuperAdminFacilityBarProps {
  isError: boolean;
  error: unknown;
  selectedTenantId: string | undefined;
  homeTenantId: string | null;
  onChange: (tenantId: string) => void;
  showSpinner: boolean;
}

function SuperAdminFacilityBar({
  isError,
  error,
  selectedTenantId,
  homeTenantId,
  onChange,
  showSpinner,
}: SuperAdminFacilityBarProps) {
  return (
    <div className="mb-6 flex flex-col items-end gap-3">
      {isError ? (
        <div
          className="w-full max-w-sm rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive"
          data-testid="dashboard-facilities-error"
        >
          {error instanceof Error ? error.message : 'Failed to load facilities'}
        </div>
      ) : (
        <div className="flex flex-wrap items-start justify-end gap-3">
          <FacilitySwitcher
            selectedTenantId={selectedTenantId}
            homeTenantId={homeTenantId}
            onChange={onChange}
          />
          {showSpinner ? (
            <Loader2
              className="mt-8 size-4 shrink-0 animate-spin text-muted-foreground"
              aria-hidden
            />
          ) : null}
        </div>
      )}
    </div>
  );
}

interface DashboardMetricsErrorProps {
  error: unknown;
  onRetry: () => void;
}

function DashboardMetricsError({ error, onRetry }: DashboardMetricsErrorProps) {
  return (
    <div
      className="rounded-lg border border-destructive/30 bg-destructive/5 p-4"
      data-testid="dashboard-metrics-error"
    >
      <p className="text-destructive">
        {isDashboardDataUnavailableError(error)
          ? error.message
          : error instanceof Error
            ? error.message
            : 'Error loading dashboard data'}
      </p>
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="mt-3"
        onClick={onRetry}
      >
        Retry
      </Button>
    </div>
  );
}

function DashboardContent({ bundle }: { bundle: DashboardMetricsBundle }) {
  return (
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
  );
}

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
        <SuperAdminFacilityBar
          isError={facilitiesQuery.isError}
          error={facilitiesQuery.error}
          selectedTenantId={effectiveTenantId ?? undefined}
          homeTenantId={homeTenantId}
          onChange={setDashboardTenantOverride}
          showSpinner={metricsQuery.isFetching && !isInitialLoad}
        />
      ) : null}

      {isInitialLoad ? (
        <div className="flex min-h-[400px] items-center justify-center text-muted-foreground">
          Loading dashboard…
        </div>
      ) : null}

      {metricsQuery.isError && !isInitialLoad ? (
        <DashboardMetricsError
          error={metricsQuery.error}
          onRetry={() => void metricsQuery.refetch()}
        />
      ) : null}

      {bundle && !metricsQuery.isError ? <DashboardContent bundle={bundle} /> : null}
    </div>
  );
}
