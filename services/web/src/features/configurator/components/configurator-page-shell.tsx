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

type ConfiguratorSection = 'tenant';

const sectionConfig: Record<ConfiguratorSection, { label: string; to: string }> = {
  tenant: { label: 'Tenant', to: '/configurator/tenant' },
};

interface ConfiguratorPageShellProps {
  section: ConfiguratorSection;
  title: string;
  description: string;
  actions?: ReactNode;
  children: ReactNode;
}

export function ConfiguratorPageShell({
  section,
  title,
  description,
  actions,
  children,
}: ConfiguratorPageShellProps) {
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
            <BreadcrumbPage>Configurator</BreadcrumbPage>
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
