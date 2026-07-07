import type { ReactNode } from 'react';
import { Link } from '@tanstack/react-router';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@pulse/ui/breadcrumb';
import { PageHeader } from '@/components/page-header';

export type InventoryBreadcrumbSegment = {
  label: string;
  to?: string;
  search?: Record<string, string | undefined>;
};

interface InventoryPageShellProps {
  title: string;
  description?: string;
  /** Single tail segment after Inventory (legacy). */
  breadcrumbLabel?: string;
  /** Full trail after Dashboard; last segment is the current page. */
  breadcrumbs?: InventoryBreadcrumbSegment[];
  actions?: ReactNode;
  children: ReactNode;
}

function resolveBreadcrumbs(
  breadcrumbLabel?: string,
  breadcrumbs?: InventoryBreadcrumbSegment[],
): InventoryBreadcrumbSegment[] {
  if (breadcrumbs?.length) {
    return breadcrumbs;
  }
  const tail = breadcrumbLabel ?? 'Inventory';
  if (tail === 'Inventory') {
    return [{ label: 'Inventory' }];
  }
  return [{ label: 'Inventory', to: '/inventory/dashboard' }, { label: tail }];
}

export function InventoryPageShell({
  title,
  description,
  breadcrumbLabel,
  breadcrumbs,
  actions,
  children,
}: InventoryPageShellProps) {
  const trail = resolveBreadcrumbs(breadcrumbLabel, breadcrumbs);

  return (
    <div className="space-y-4 p-6">
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink asChild>
              <Link to="/dashboard">Dashboard</Link>
            </BreadcrumbLink>
          </BreadcrumbItem>
          {trail.map((segment, index) => {
            const isLast = index === trail.length - 1;
            return (
              <span key={`${segment.label}-${index}`} className="contents">
                <BreadcrumbSeparator />
                <BreadcrumbItem>
                  {isLast || !segment.to ? (
                    <BreadcrumbPage>{segment.label}</BreadcrumbPage>
                  ) : (
                    <BreadcrumbLink asChild>
                      <Link to={segment.to} search={segment.search}>
                        {segment.label}
                      </Link>
                    </BreadcrumbLink>
                  )}
                </BreadcrumbItem>
              </span>
            );
          })}
        </BreadcrumbList>
      </Breadcrumb>

      <PageHeader title={title} description={description} actions={actions} />
      {children}
    </div>
  );
}
