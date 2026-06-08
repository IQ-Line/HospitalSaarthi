import type { ReactNode } from 'react';
import { Search } from 'lucide-react';
import { useTenantStore } from '@/stores/tenant.store';
import { useDashboardMetricsSidebar } from '@/features/dashboard/hooks/use-dashboard-metrics';
import { Skeleton } from '@pulse/ui/skeleton';
import { Button } from '@pulse/ui/button';
import { Input } from '@pulse/ui/input';
import { Label } from '@pulse/ui/label';
import {
  FormField as RegistrationField,
  FormFieldLabel as RegistrationFieldLabel,
  FormSection as RegistrationSection,
  FormSubsectionLabel as RegistrationSubsectionLabel,
} from '@/components/form-chrome';

export {
  RegistrationSection,
  RegistrationSubsectionLabel,
  RegistrationFieldLabel,
  RegistrationField,
};

/** Right-rail counters from Registration dashboard stats API. */
export function RegistrationTodayStatsSidebar() {
  const tenantId = useTenantStore((s) => s.tenantId ?? s.homeTenantId);
  const metricsQuery = useDashboardMetricsSidebar(tenantId ?? null);
  const s = metricsQuery.data?.stats;
  const isLoading = metricsQuery.isLoading && !metricsQuery.data;

  const stats = [
    { label: 'Total Visits', value: s?.totalVisits },
    { label: 'New Patient Registrations', value: s?.newPatientRegistrations },
    { label: 'Follow Up Patient Registrations', value: s?.followUpPatientRegistrations },
    { label: 'Doctor Pending Consultations', value: s?.doctorPendingConsultations },
  ] as const;

  return (
    <aside className="space-y-3 lg:sticky lg:top-4 lg:self-start">
      <h2 className="text-base font-semibold text-foreground">Today&apos;s Statistics</h2>
      {metricsQuery.isError ? (
        <p className="text-sm text-destructive">Could not load today&apos;s statistics.</p>
      ) : null}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
        {stats.map((stat) => (
          <div
            key={stat.label}
            className="flex items-center justify-between gap-3 rounded-md border border-border bg-card px-4 py-3 shadow-sm"
          >
            <span className="text-sm leading-snug text-muted-foreground">{stat.label}</span>
            {isLoading ? (
              <Skeleton className="h-8 w-12 shrink-0" aria-hidden />
            ) : (
              <span className="shrink-0 text-2xl font-semibold tabular-nums text-foreground">
                {stat.value ?? 0}
              </span>
            )}
          </div>
        ))}
      </div>
    </aside>
  );
}

type RegistrationFormHeaderProps = {
  searchValue: string;
  onSearchChange: (value: string) => void;
  onPatientQueue: () => void;
  actions?: ReactNode;
};

/**
 * Top chrome: title, queue/token chips, search, OPD Visit tab.
 * Uses @pulse/ui Button and Input.
 */
export function RegistrationFormHeader({
  searchValue,
  onSearchChange,
  onPatientQueue,
  actions,
}: RegistrationFormHeaderProps) {
  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">Registration</h1>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            variant="secondary"
            size="sm"
            className="h-9 rounded-full bg-muted px-4 text-foreground shadow-none"
            onClick={onPatientQueue}
          >
            Patient Queue
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-9 rounded-full px-4"
            disabled
          >
            Token
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-9 rounded-full px-4"
            disabled
          >
            ABHA Token
          </Button>
          <div className="relative min-w-[12rem] flex-1 sm:min-w-[16rem] sm:max-w-xs">
            <Label htmlFor="reg-header-search" className="sr-only">
              Search by name or mobile
            </Label>
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              id="reg-header-search"
              value={searchValue}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Search by Name, Mobile (10 dig"
              className="h-9 pl-9"
              autoComplete="off"
            />
          </div>
          {actions}
        </div>
      </div>
      <div>
        <span className="inline-block border-b-2 border-primary pb-1.5 text-sm font-medium text-primary">
          OPD Visit
        </span>
      </div>
    </div>
  );
}
