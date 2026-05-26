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

type MasterDataSection = 'modules' | 'permissions' | 'module-permissions';

const sectionConfig: Record<MasterDataSection, { label: string; to: string }> = {
  modules: { label: 'Modules', to: '/master-data/modules' },
  permissions: { label: 'Permissions', to: '/master-data/permissions' },
  'module-permissions': { label: 'Module Permissions', to: '/master-data/module-permissions' },
};

interface MasterDataPageShellProps {
  section: MasterDataSection;
  title: string;
  description: string;
  actions?: ReactNode;
  children: ReactNode;
}

export function MasterDataPageShell({
  section,
  title,
  description,
  actions,
  children,
}: MasterDataPageShellProps) {
  const activeItem = sectionConfig[section];

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
            <BreadcrumbPage>Master Data</BreadcrumbPage>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>{activeItem.label}</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <div className="border-b">
        <nav className="flex items-center gap-1 -mb-px overflow-x-auto">
          {Object.entries(sectionConfig).map(([value, item]) => (
            <Link
              key={value}
              to={item.to}
              className="inline-flex h-9 items-center border-b-2 border-transparent px-3 text-sm text-foreground/70 hover:text-foreground transition-colors"
              activeProps={{
                className:
                  'inline-flex h-9 items-center border-b-2 border-foreground px-3 text-sm font-semibold text-foreground',
              }}
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </div>

      <PageHeader title={title} description={description} actions={actions} />

      {children}
    </div>
  );
}
