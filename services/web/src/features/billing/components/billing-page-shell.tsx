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

interface BillingPageShellProps {
  title: string;
  description: string;
  /** Breadcrumb tail label; defaults to `title`. */
  breadcrumbLabel?: string;
  actions?: ReactNode;
  children: ReactNode;
}

export function BillingPageShell({
  title,
  description,
  breadcrumbLabel,
  actions,
  children,
}: BillingPageShellProps) {
  const breadcrumb = breadcrumbLabel ?? title;
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
            <BreadcrumbPage>Billing</BreadcrumbPage>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>{breadcrumb}</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <PageHeader title={title} description={description} actions={actions} />
      {children}
    </div>
  );
}
