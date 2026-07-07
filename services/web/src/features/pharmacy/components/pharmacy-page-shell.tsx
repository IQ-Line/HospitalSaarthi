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

type PharmacyPageShellProps = {
  title: string;
  description?: string;
  breadcrumbLabel?: string;
  actions?: ReactNode;
  children: ReactNode;
  /** Full-height layout without outer padding (dispense workspace). */
  fullHeight?: boolean;
};

export function PharmacyPageShell({
  title,
  description,
  breadcrumbLabel,
  actions,
  children,
  fullHeight = false,
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
            {tail !== 'Pharmacy' ? (
              <>
                <BreadcrumbSeparator />
                <BreadcrumbItem>
                  <BreadcrumbPage>{tail}</BreadcrumbPage>
                </BreadcrumbItem>
              </>
            ) : null}
          </BreadcrumbList>
        </Breadcrumb>

        <PageHeader title={title} description={description} actions={actions} />
      </div>
      <div className={fullHeight ? 'flex min-h-0 flex-1 flex-col' : undefined}>{children}</div>
    </div>
  );
}
