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
import {
  type InventoryOperationalVariant,
  resolveOperationalContext,
} from '../lib/inventory-operational-variant';

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
  /** When set, overrides module root in breadcrumbs (inventory vs pharmacy). */
  variant?: InventoryOperationalVariant;
  actions?: ReactNode;
  children: ReactNode;
}

function resolveBreadcrumbs(
  breadcrumbLabel?: string,
  breadcrumbs?: InventoryBreadcrumbSegment[],
  variant: InventoryOperationalVariant = 'inventory',
): InventoryBreadcrumbSegment[] {
  const ctx = resolveOperationalContext(variant);
  if (breadcrumbs?.length) {
    return breadcrumbs;
  }
  const tail = breadcrumbLabel ?? ctx.moduleLabel;
  if (tail === ctx.moduleLabel) {
    return [{ label: ctx.moduleLabel }];
  }
  const moduleRoot =
    variant === 'pharmacy'
      ? { label: ctx.moduleLabel, to: '/pharmacy/dashboard' as const }
      : { label: ctx.moduleLabel, to: '/inventory/dashboard' as const };
  return [moduleRoot, { label: tail }];
}

export function InventoryPageShell({
  title,
  description,
  breadcrumbLabel,
  breadcrumbs,
  variant = 'inventory',
  actions,
  children,
}: InventoryPageShellProps) {
  const trail = resolveBreadcrumbs(breadcrumbLabel, breadcrumbs, variant);

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
