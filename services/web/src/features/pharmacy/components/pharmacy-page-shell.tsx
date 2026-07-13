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
import { PharmacyStoreSelector } from './pharmacy-store-selector';

type PharmacyBreadcrumbCrumb = {
  label: string;
  href?: string;
};

type PharmacyPageShellProps = {
  title: string;
  description?: string;
  breadcrumbLabel?: string;
  /** Extra crumbs between Pharmacy and the current page (e.g. Replenishment before New). */
  breadcrumbTrail?: readonly PharmacyBreadcrumbCrumb[];
  actions?: ReactNode;
  children: ReactNode;
  /** Full-height layout without outer padding (dispense workspace). */
  fullHeight?: boolean;
  /** Hide the default PageHeader (use when embedding PageHeaderWithTabs). */
  hideTitle?: boolean;
};

export function PharmacyPageShell({
  title,
  description,
  breadcrumbLabel,
  breadcrumbTrail,
  actions,
  children,
  fullHeight = false,
  hideTitle = false,
}: PharmacyPageShellProps) {
  const tail = breadcrumbLabel ?? title;

  return (
    <div className={fullHeight ? 'flex min-h-0 flex-1 flex-col' : 'space-y-4 p-6'}>
      <div className={fullHeight ? 'shrink-0 space-y-4 px-6 pt-6' : undefined}>
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink asChild>
                <Link to="/dashboard">Dashboard</Link>
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbLink asChild>
                <Link to="/pharmacy/dashboard">Pharmacy</Link>
              </BreadcrumbLink>
            </BreadcrumbItem>
            {breadcrumbTrail?.map((crumb) => (
              <span key={crumb.label} className="contents">
                <BreadcrumbSeparator />
                <BreadcrumbItem>
                  {crumb.href ? (
                    <BreadcrumbLink asChild>
                      <Link to={crumb.href}>{crumb.label}</Link>
                    </BreadcrumbLink>
                  ) : (
                    <BreadcrumbPage>{crumb.label}</BreadcrumbPage>
                  )}
                </BreadcrumbItem>
              </span>
            ))}
            {tail !== 'Pharmacy' && !breadcrumbTrail?.some((c) => c.label === tail) ? (
              <>
                <BreadcrumbSeparator />
                <BreadcrumbItem>
                  <BreadcrumbPage>{tail}</BreadcrumbPage>
                </BreadcrumbItem>
              </>
            ) : null}
          </BreadcrumbList>
        </Breadcrumb>

        {hideTitle ? (
          <div className="flex justify-end">
            <PharmacyStoreSelector />
          </div>
        ) : (
          <PageHeader
            title={title}
            description={description}
            actions={
              <>
                <PharmacyStoreSelector />
                {actions}
              </>
            }
          />
        )}
      </div>
      <div className={fullHeight ? 'flex min-h-0 flex-1 flex-col' : undefined}>{children}</div>
    </div>
  );
}
