import { useEffect, useState, type ComponentType } from 'react';
import {
  createFileRoute,
  Link,
  Outlet,
  redirect,
  useLocation,
} from '@tanstack/react-router';
import {
  ChevronDown,
  ChevronRight,
  Database,
  LayoutGrid,
  Link2,
  PanelLeftClose,
  PanelLeftOpen,
  ShieldCheck,
  Users,
} from 'lucide-react';
import { Button } from '@pulse/ui/button';
import { useAuthStore } from '@/stores/auth.store';
import { usePermissionsStore } from '@/stores/permissions.store';
import { useTenantStore } from '@/stores/tenant.store';

export const Route = createFileRoute('/_authenticated')({
  beforeLoad: () => {
    const { isAuthenticated } = useAuthStore.getState();
    if (!isAuthenticated) {
      throw redirect({ to: '/login' });
    }
  },
  component: AuthenticatedLayout,
});

function AuthenticatedLayout() {
  const displayName = useAuthStore((s) => s.displayName);
  const tenantName = useTenantStore((s) => s.tenantName);
  const isLoaded = usePermissionsStore((s) => s.isLoaded);
  const hasModuleAccess = usePermissionsStore((s) => s.hasModuleAccess);
  const { pathname } = useLocation();
  const isInMasterData = pathname.startsWith('/master-data');
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMasterDataOpen, setIsMasterDataOpen] = useState(true);

  useEffect(() => {
    if (isInMasterData) {
      setIsMasterDataOpen(true);
    }
  }, [isInMasterData]);

  if (!isLoaded) {
    return (
      <div className="flex h-screen items-center justify-center">
        <p className="text-muted-foreground">Loading permissions...</p>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-background">
      <aside
        className={`border-r bg-sidebar flex flex-col transition-all duration-200 ${
          isSidebarCollapsed ? 'w-16 p-2' : 'w-64 p-3'
        }`}
      >
        <div
          className={`mb-4 flex items-center ${
            isSidebarCollapsed ? 'justify-center' : 'gap-2'
          }`}
        >
          <div className="flex items-center gap-2 min-w-0">
            <BrandMark />
            {!isSidebarCollapsed && (
              <div className="min-w-0">
                <h1 className="text-sm font-semibold truncate">HIMS</h1>
                {tenantName && (
                  <p className="text-xs text-muted-foreground truncate">{tenantName}</p>
                )}
              </div>
            )}
          </div>
        </div>

        <nav className="space-y-1 flex-1 overflow-y-auto">
          <NavLink
            to="/dashboard"
            label="Dashboard"
            icon={LayoutGrid}
            collapsed={isSidebarCollapsed}
          />
          {hasModuleAccess('master-data') && (
            <MasterDataNavSection
              collapsed={isSidebarCollapsed}
              isOpen={isMasterDataOpen}
              onToggle={() => {
                if (isSidebarCollapsed) {
                  setIsSidebarCollapsed(false);
                  return;
                }
                setIsMasterDataOpen((prev) => !prev);
              }}
            />
          )}
        </nav>

        <div className="pt-3 mt-3 border-t">
          <p className="text-xs truncate text-muted-foreground">
            {isSidebarCollapsed ? 'User' : displayName}
          </p>
        </div>
      </aside>

      <main className="flex-1 min-w-0 flex flex-col overflow-hidden">
        <div className="h-10 border-b bg-background px-3 flex items-center">
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => setIsSidebarCollapsed((prev) => !prev)}
            aria-label={isSidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {isSidebarCollapsed ? (
              <PanelLeftOpen className="size-4" />
            ) : (
              <PanelLeftClose className="size-4" />
            )}
          </Button>
        </div>
        <div className="flex-1 overflow-auto">
          <Outlet />
        </div>
      </main>
    </div>
  );
}

function NavLink({
  to,
  label,
  icon: Icon,
  collapsed,
  nested = false,
}: {
  to: string;
  label: string;
  icon?: ComponentType<{ className?: string }>;
  collapsed: boolean;
  nested?: boolean;
}) {
  return (
    <Link
      to={to}
      className={`flex items-center gap-2 rounded-md px-2 py-1.5 text-sm text-foreground/70 hover:bg-sidebar-accent transition-colors ${
        nested && !collapsed ? 'ml-6' : ''
      } ${collapsed ? 'justify-center' : ''}`}
      activeProps={{
        className: `flex items-center gap-2 rounded-md px-2 py-1.5 text-sm bg-sidebar-accent font-semibold text-foreground ${
          nested && !collapsed ? 'ml-6' : ''
        } ${collapsed ? 'justify-center' : ''}`,
      }}
      title={collapsed ? label : undefined}
    >
      {Icon && <Icon className="size-4 shrink-0" />}
      {!collapsed && <span className="truncate">{label}</span>}
    </Link>
  );
}

function MasterDataNavSection({
  collapsed,
  isOpen,
  onToggle,
}: {
  collapsed: boolean;
  isOpen: boolean;
  onToggle: () => void;
}) {
  return (
    <div className="space-y-1">
      <button
        type="button"
        onClick={onToggle}
        className={`w-full flex items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-sidebar-accent transition-colors ${
          collapsed ? 'justify-center' : ''
        }`}
        title={collapsed ? 'Master Data' : undefined}
      >
        <Database className="size-4 shrink-0" />
        {!collapsed && (
          <>
            <span className="font-medium">Master Data</span>
            {isOpen ? (
              <ChevronDown className="size-4 ml-auto" />
            ) : (
              <ChevronRight className="size-4 ml-auto" />
            )}
          </>
        )}
      </button>

      {isOpen && (
        <div className="space-y-1">
          <NavLink
            to="/master-data/modules"
            label="Modules"
            icon={Database}
            collapsed={collapsed}
            nested
          />
          <NavLink
            to="/master-data/permissions"
            label="Permissions"
            icon={ShieldCheck}
            collapsed={collapsed}
            nested
          />
          <NavLink
            to="/master-data/system-roles"
            label="System Roles"
            icon={Users}
            collapsed={collapsed}
            nested
          />
          <NavLink
            to="/master-data/module-permissions"
            label="Module Permissions"
            icon={Link2}
            collapsed={collapsed}
            nested
          />
        </div>
      )}
    </div>
  );
}

function BrandMark() {
  return (
    <svg
      width="32"
      height="32"
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="h-7 w-auto shrink-0"
      aria-hidden="true"
    >
      <path
        d="M3 27.2716L11.3008 32V22.5124V20.1429L3 15.3784V27.2716Z"
        fill="#4A4C60"
      />
      <path d="M11.3192 13.0377L3 8.33915V13.0301L11.3008 17.7734L11.3192 13.0377Z" fill="#4A4C60" />
      <path
        d="M17.5819 0L3 8.33915L11.3192 13.0377L17.5819 9.48669L25.8827 4.74334L17.5819 0Z"
        fill="#3AA9A0"
      />
      <path
        d="M17.5819 18.9734L11.3008 22.5124V32L19.6762 27.2716L23.9192 29.6889L30.1767 26.0624L17.5819 18.9734Z"
        fill="#3AA9A0"
      />
      <path
        d="M17.5819 18.9734L30.1767 26.0624V18.9734L25.8827 16.6017V4.74334L17.5819 9.48669V18.9734Z"
        fill="#2E8981"
      />
    </svg>
  );
}
