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

interface InventoryPageShellProps {
  title: string;
  description?: string;
  breadcrumbLabel?: string;
  actions?: ReactNode;
  children: ReactNode;
}

export function InventoryPageShell({
  title,
  description,
  breadcrumbLabel,
  actions,
  children,
}: InventoryPageShellProps) {
  const tail = breadcrumbLabel ?? title;

  return (
    <div className="space-y-4 p-6">
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
              <Link to="/inventory/dashboard">Inventory</Link>
            </BreadcrumbLink>
          </BreadcrumbItem>
          {tail !== 'Inventory' ? (
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
      {children}
    </div>
  );
}
