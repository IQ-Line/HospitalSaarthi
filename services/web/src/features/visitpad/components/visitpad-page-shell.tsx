import type { ReactNode } from 'react';
import { Link, useRouterState } from '@tanstack/react-router';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@pulse/ui/breadcrumb';
import { PageHeader } from '@/components/page-header';
import { useFilteredVisitpadPrimaryTabs } from '@/features/visitpad/hooks/use-filtered-visitpad-primary-tabs';
import { resolveVisitpadPrimaryTabLandingRoute } from '@/features/visitpad/lib/visitpad-access';
import type { VisitpadPrimaryTab } from '@/features/visitpad/visitpad-nav-model';
import { usePermissionsStore } from '@/stores/permissions.store';

interface VisitpadPageShellProps {
  primary: VisitpadPrimaryTab;
  /** Breadcrumb tail (defaults from primary tab). */
  breadcrumbLabel?: string;
  /** e.g. Vitals (8/15) — active vs total for the current primary tab when provided. */
  tabCount?: { active: number; total: number };
  title: string;
  description: string;
  /** Secondary row (e.g. Units | Conversions, Allergens | Reactions). */
  secondaryNav?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
}

function isPrimaryTabActive(pathname: string, tabId: VisitpadPrimaryTab, tabTo: string): boolean {
  if (tabId === 'units') {
    return pathname.startsWith('/visitpad/units') || pathname.startsWith('/visitpad/conversions');
  }
  if (tabId === 'allergies') {
    return pathname.startsWith('/visitpad/allergens') || pathname.startsWith('/visitpad/reactions');
  }
  return pathname === tabTo || pathname.startsWith(`${tabTo}/`);
}

export function VisitpadPageShell({
  primary,
  breadcrumbLabel: breadcrumbLabelProp,
  tabCount,
  title,
  description,
  secondaryNav,
  actions,
  children,
}: VisitpadPageShellProps) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const capabilityKeys = usePermissionsStore((s) => s.capabilityKeys);
  const visibleTabs = useFilteredVisitpadPrimaryTabs();
  const primaryLabel = visibleTabs.find((t) => t.id === primary)?.label ?? 'Visitpad';
  const breadcrumbLabel = breadcrumbLabelProp ?? primaryLabel;

  return (
    <div className="p-6 space-y-4">
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink asChild>
              <Link to="/dashboard">Dashboard</Link>
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>Visitpad templates</BreadcrumbPage>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>{breadcrumbLabel}</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <div className="border-b">
        <nav className="flex items-center gap-1 -mb-px overflow-x-auto">
          {visibleTabs.map((tab) => {
            const tabTo = resolveVisitpadPrimaryTabLandingRoute(capabilityKeys, tab.id);
            const active = isPrimaryTabActive(pathname, tab.id, tabTo);
            const label =
              tabCount && tab.id === primary
                ? `${tab.label} (${tabCount.active}/${tabCount.total})`
                : tab.label;
            return (
              <Link
                key={tab.id}
                to={tabTo}
                className={
                  active
                    ? 'inline-flex h-9 items-center border-b-2 border-foreground px-3 text-sm font-semibold text-foreground whitespace-nowrap'
                    : 'inline-flex h-9 items-center border-b-2 border-transparent px-3 text-sm text-foreground/70 hover:text-foreground transition-colors whitespace-nowrap'
                }
              >
                {label}
              </Link>
            );
          })}
        </nav>
      </div>

      {secondaryNav ? <div className="border-b pb-2">{secondaryNav}</div> : null}

      <PageHeader title={title} description={description} actions={actions} />

      {children}
    </div>
  );
}
