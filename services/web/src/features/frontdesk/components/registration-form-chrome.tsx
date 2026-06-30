import type { ReactNode } from 'react';
import { Search } from 'lucide-react';
import { useTenantStore } from '@/stores/tenant.store';
import { useDashboardMetricsSidebar } from '@/features/dashboard/hooks/use-dashboard-metrics';
import { Skeleton } from '@pulse/ui/skeleton';
import { Button } from '@pulse/ui/button';
import { Input } from '@pulse/ui/input';
import { Label } from '@pulse/ui/label';
import { cn } from '@pulse/utils';

/** Section shell matching registration mock — cyan header band + white body. */
export function RegistrationSection({
  title,
  children,
  className,
}: {
  title: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={cn('overflow-hidden rounded-md border border-border bg-card', className)}>
      <div className="border-b border-border bg-muted/40 px-4 py-2.5 text-sm font-medium text-foreground">
        {title}
      </div>
      <div className="space-y-3 p-3 md:p-4">{children}</div>
    </section>
  );
}

/** Subsection label with trailing rule (e.g. "Patient Details", "Address"). */
export function RegistrationSubsectionLabel({ children }: { children: ReactNode }) {
  return (
    <div className="flex items-center gap-3 pt-1">
      <span className="shrink-0 text-xs text-muted-foreground">{children}</span>
      <div className="h-px flex-1 bg-border" aria-hidden />
    </div>
  );
}

/** Field label with optional required asterisk. */
export function RegistrationFieldLabel({
  htmlFor,
  required,
  children,
}: {
  htmlFor?: string;
  required?: boolean;
  children: ReactNode;
}) {
  return (
    <Label htmlFor={htmlFor} className="text-sm font-normal text-foreground">
      {children}
      {required ? <span className="text-destructive"> *</span> : null}
    </Label>
  );
}

/** Standard vertical field stack used across registration grids. */
export function RegistrationField({
  className,
  children,
}: {
  className?: string;
  children: ReactNode;
}) {
  return <div className={cn('space-y-1.5', className)}>{children}</div>;
}

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
  tokenValue?: string;
  onTokenChange?: (value: string) => void;
  onTokenSubmit?: () => void;
  scanShareDisabled?: boolean;
  scanShareDisabledReason?: string;
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
  tokenValue = '',
  onTokenChange,
  onTokenSubmit,
  scanShareDisabled = false,
  scanShareDisabledReason,
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
            disabled={scanShareDisabled}
            title={scanShareDisabled ? scanShareDisabledReason : undefined}
          >
            Patient Queue
          </Button>
          {!scanShareDisabled && onTokenChange && onTokenSubmit ? (
            <Input
              value={tokenValue}
              onChange={(e) => onTokenChange(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  onTokenSubmit();
                }
              }}
              placeholder="ABHA Token"
              className="h-9 w-28 rounded-full"
              disabled={scanShareDisabled}
              autoComplete="off"
            />
          ) : (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-9 rounded-full px-4"
              disabled
            >
              Token
            </Button>
          )}
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
