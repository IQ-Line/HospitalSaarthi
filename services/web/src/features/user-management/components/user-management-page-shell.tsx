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
import {
  canAccessRolesAdmin,
  canAccessUsersSection,
  canReadUsers,
  canWriteUsers,
} from '@/features/user-management/lib/um-permissions';
import { usePermissionsStore } from '@/stores/permissions.store';

type UserManagementSection = 'users' | 'roles';

const sectionItems = [
  { section: 'users' as const, label: 'Users', to: '/user-management' as const },
  { section: 'roles' as const, label: 'Roles', to: '/user-management/roles' as const },
];

type UserManagementPageShellProps = {
  section: UserManagementSection;
  title: string;
  description: string;
  actions?: ReactNode;
  breadcrumbLabel?: string;
  pageContext?: ReactNode;
  children: ReactNode;
};

function isSectionActive(pathname: string, section: UserManagementSection): boolean {
  if (section === 'roles') {
    return pathname === '/user-management/roles';
  }

  return pathname === '/user-management' || (pathname.startsWith('/user-management/') && pathname !== '/user-management/roles');
}

function usersTabLabel(canRead: boolean, canWrite: boolean): string {
  if (canRead) return 'Users';
  if (canWrite) return 'Create user';
  return 'Users';
}

export function UserManagementPageShell({
  section,
  title,
  description,
  actions,
  breadcrumbLabel,
  pageContext,
  children,
}: UserManagementPageShellProps) {
  const canRead = usePermissionsStore(canReadUsers);
  const canWrite = usePermissionsStore(canWriteUsers);
  const showUsersTab = usePermissionsStore(canAccessUsersSection);
  const showRolesTab = usePermissionsStore(canAccessRolesAdmin);

  const visibleSections = sectionItems.filter((item) => {
    if (item.section === 'users') return showUsersTab;
    if (item.section === 'roles') return showRolesTab;
    return false;
  });

  const activeItem =
    visibleSections.find((item) => item.section === section) ?? visibleSections[0] ?? sectionItems[0];
  const pathname = useRouterState({ select: (state) => state.location.pathname });

  return (
    <div className="space-y-6 p-6">
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink asChild>
              <Link to="/dashboard">Dashboard</Link>
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>User Management</BreadcrumbPage>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>{breadcrumbLabel ?? activeItem.label}</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      {visibleSections.length > 1 ? (
        <div className="border-b">
          <nav className="-mb-px flex items-center gap-1 overflow-x-auto">
            {visibleSections.map((item) => (
              <Link
                key={item.section}
                to={item.to}
                className={
                  isSectionActive(pathname, item.section)
                    ? 'inline-flex h-9 items-center whitespace-nowrap border-b-2 border-foreground px-3 text-sm font-semibold text-foreground'
                    : 'inline-flex h-9 items-center whitespace-nowrap border-b-2 border-transparent px-3 text-sm text-foreground/70 transition-colors hover:text-foreground'
                }
              >
                {item.section === 'users' ? usersTabLabel(canRead, canWrite) : item.label}
              </Link>
            ))}
          </nav>
        </div>
      ) : null}

      {pageContext ? <div>{pageContext}</div> : null}

      <PageHeader title={title} description={description} actions={actions} />

      {children}
    </div>
  );
}
